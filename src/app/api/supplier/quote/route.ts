
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/app/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { rfpId, validFor, currency, shipping, comments, items } = body;

        // 1. Identify Supplier
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

        // 2. Validate RFP access
        const rfp = await prisma.procurementRequest.findFirst({
            where: {
                id: rfpId,
                suppliers: { some: { id: supplierId } }
            }
        });

        if (!rfp) {
            return NextResponse.json({ error: "Invalid RFP or Access Denied" }, { status: 403 });
        }

        // 3. Create or Update Quote
        // Since we allow one quote per supplier per RFP usually:
        // Check existing
        const existingQuote = await prisma.quote.findFirst({
            where: {
                procurementRequestId: rfpId,
                supplierId: supplierId
            }
        });

        if (existingQuote) {
            // Update mode - usually we might version it or just update. 
            // For simplicity, let's update.
            // First delete old items
            await prisma.quoteItem.deleteMany({
                where: { quoteId: existingQuote.id }
            });

            await prisma.quote.update({
                where: { id: existingQuote.id },
                data: {
                    supplierQuoteNo: `Q-${Date.now()}`, // Auto-generated for now
                    validFor,
                    currency,
                    shipping,
                    comments,
                    items: {
                        create: items.map((item: any) => ({
                            supplierPartNo: item.supplierPartNo,
                            deliveryDays: item.deliveryDays,
                            unitPrice: parseFloat(item.unitPrice),
                            qty: parseInt(item.qty),
                            uom: item.uom,
                            cost: parseFloat(item.unitPrice) * parseInt(item.qty),
                            procurementItemId: item.procurementItemId
                        }))
                    }
                }
            });

            return NextResponse.json({ success: true, message: "Quote updated successfully" });

        } else {
            // Create New
            await prisma.quote.create({
                data: {
                    supplierId: supplierId!,
                    procurementRequestId: rfpId,
                    supplierQuoteNo: `Q-${Date.now()}`,
                    validFor,
                    currency,
                    shipping,
                    comments,
                    items: {
                        create: items.map((item: any) => ({
                            supplierPartNo: item.supplierPartNo,
                            deliveryDays: item.deliveryDays,
                            unitPrice: parseFloat(item.unitPrice),
                            qty: parseInt(item.qty),
                            uom: item.uom,
                            cost: parseFloat(item.unitPrice) * parseInt(item.qty),
                            procurementItemId: item.procurementItemId
                        }))
                    }
                }
            });

            return NextResponse.json({ success: true, message: "Quote submitted successfully" });
        }


    } catch (error) {
        console.error("Error submitting quote:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
