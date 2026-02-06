
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/app/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { rfpId, quotes, answers, attachments, status } = body;

        if (!rfpId) {
            return NextResponse.json({ error: "RFP ID is required" }, { status: 400 });
        }

        // Identify Supplier
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { supplierId: true }
        });

        let supplierId = user?.supplierId;

        if (!supplierId) {
            const supplier = await prisma.supplier.findUnique({
                where: { registrationEmail: session.user.email }
            });
            supplierId = supplier?.id;
        }

        if (!supplierId) {
            return NextResponse.json({ error: "Supplier profile not found" }, { status: 404 });
        }

        // 1. Save Quote Items & Attachments
        let savedQuote;

        // Find existing quote or create
        let quote = await prisma.quote.findFirst({
            where: {
                procurementRequestId: rfpId,
                supplierId: supplierId
            }
        });

        if (!quote) {
            quote = await prisma.quote.create({
                data: {
                    supplierQuoteNo: `Q-${Date.now()}`, // Auto-gen
                    validFor: "30 Days",
                    currency: "USD",
                    shipping: "Included",
                    supplierId: supplierId,
                    procurementRequestId: rfpId,
                    attachments: attachments // Save attachments on create
                }
            });
        } else if (attachments) {
            // Update attachments if resolved
            await prisma.quote.update({
                where: { id: quote.id },
                data: { attachments }
            });
        }

        savedQuote = quote;

        // Upsert items if quotes provided
        if (quotes && Object.keys(quotes).length > 0) {
            for (const [itemId, data] of Object.entries(quotes)) {
                const itemData = data as any;
                // Check if item exists in this quote
                const existingItem = await prisma.quoteItem.findFirst({
                    where: {
                        quoteId: quote.id,
                        procurementItemId: itemId
                    }
                });

                if (existingItem) {
                    await prisma.quoteItem.update({
                        where: { id: existingItem.id },
                        data: {
                            qty: parseInt(itemData.qty) || 0,
                            unitPrice: parseFloat(itemData.unitPrice) || 0,
                            deliveryDays: itemData.deliveryDays,
                            supplierPartNo: itemData.supplierPartNo
                        }
                    });
                } else {
                    await prisma.quoteItem.create({
                        data: {
                            quoteId: quote.id,
                            procurementItemId: itemId,
                            qty: parseInt(itemData.qty) || 0,
                            unitPrice: parseFloat(itemData.unitPrice) || 0,
                            deliveryDays: itemData.deliveryDays,
                            supplierPartNo: itemData.supplierPartNo
                        }
                    });
                }
            }
        }

        // 2. Save Questionnaire Answers
        if (answers && Object.keys(answers).length > 0) {
            for (const [questionId, answerData] of Object.entries(answers)) {
                await prisma.rfpResponse.upsert({
                    where: {
                        supplierId_procurementRequestId_questionId: {
                            supplierId,
                            procurementRequestId: rfpId,
                            questionId
                        }
                    },
                    update: {
                        answer: answerData as any
                    },
                    create: {
                        supplierId,
                        procurementRequestId: rfpId,
                        questionId,
                        answer: answerData as any
                    }
                });
            }
        }

        // 3. Update Status (Optional log)

        return NextResponse.json({ success: true, quoteId: savedQuote?.id });

    } catch (error: any) {
        console.error("Error saving response:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
