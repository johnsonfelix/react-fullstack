
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // 1. Identify Supplier
        // Try to find User record first
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { supplierId: true }
        });

        let supplierId = user?.supplierId;

        // 2. If no linked supplierId, try to find Supplier by email directly
        if (!supplierId) {
            const supplier = await prisma.supplier.findUnique({
                where: { registrationEmail: session.user.email }
            });
            supplierId = supplier?.id;
        }

        if (!supplierId) {
            console.error(`[SupplierRFP] No supplier profile found for email: ${session.user.email}`);
            return NextResponse.json({ error: "Supplier profile not found" }, { status: 404 });
        }

        console.log(`[SupplierRFP] Fetching RFP ${id} for supplier ${supplierId}`);

        // 3. Fetch RFP with validation that supplier is invited
        const rfp = await prisma.procurementRequest.findFirst({
            where: {
                id: id,
                suppliers: {
                    some: { id: supplierId }
                }
            },
            include: {
                items: true,
                // attachments: true, // Need to verify if attachments is a JSON field or relation. Schema says Json?
                // terms: true,      // Schema says Json?
                // quotes relation
                quotes: {
                    where: { supplierId: supplierId },
                    include: {
                        items: true
                    }
                },
                rfpResponses: {
                    where: { supplierId: supplierId }
                }
            }
        });

        if (!rfp) {
            // Check if RFP exists at all vs access denied
            const exists = await prisma.procurementRequest.findUnique({ where: { id } });
            if (exists) {
                console.warn(`[SupplierRFP] Access denied. Supplier ${supplierId} not invited to RFP ${id}`);
                return NextResponse.json({ error: "Access denied. You are not invited to this RFP." }, { status: 403 });
            }
            return NextResponse.json({ error: "RFP not found" }, { status: 404 });
        }

        // Resolve Address ID if possible
        let formattedAddress = rfp.address;
        if (rfp.address && rfp.address.length > 10) { // Simple check to see if it might be an ID
            try {
                const addressRecord = await prisma.address.findUnique({
                    where: { id: rfp.address }
                });
                if (addressRecord) {
                    formattedAddress = `${addressRecord.line1}, ${addressRecord.city}, ${addressRecord.country}`;
                }
            } catch (e) {
                // Ignore error, use original string
            }
        }

        return NextResponse.json({ ...rfp, address: formattedAddress });

    } catch (error: any) {
        console.error("Error fetching supplier RFP:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
