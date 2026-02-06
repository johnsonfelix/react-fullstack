
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            console.error("[SupplierDashboard] No session or email found");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const start = Date.now();
        // Find the supplier associated with this user
        // We try to find by registrationEmail matching the user email
        // OR we check if the user has a linked supplierId
        let supplierId: string | null | undefined = null;

        // 1. Try to find User record first
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { supplierId: true }
        });

        supplierId = user?.supplierId;

        // 2. If no linked supplierId, try to find Supplier by email directly (legacy/invited)
        if (!supplierId) {
            const supplier = await prisma.supplier.findUnique({
                where: { registrationEmail: session.user.email }
            });
            supplierId = supplier?.id;
        }

        if (!supplierId) {
            console.error(`[SupplierDashboard] No supplier profile found for email: ${session.user.email}`);
            return NextResponse.json({ error: "Supplier profile not found" }, { status: 404 });
        }

        // Fetch RFPs
        const rfps = await prisma.procurementRequest.findMany({
            where: {
                status: "PUBLISHED", // Only show published events
                suppliers: {
                    some: {
                        id: supplierId
                    }
                }
            },
            select: {
                id: true,
                title: true,
                status: true,
                requestType: true,
                createdAt: true,
                updatedAt: true,
                additionalFields: true,

                // Check if this supplier has already responded?
                quotes: {
                    where: {
                        supplierId: supplierId
                    },
                    select: {
                        id: true,
                        createdAt: true
                    }
                },
                // Include participation status
                eventParticipations: {
                    where: {
                        supplierId: supplierId
                    },
                    select: {
                        status: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        const parsedRfps = rfps.map((rfp: any) => {
            // Safe cast or check for additionalFields
            const addFields = rfp.additionalFields as any || {};
            // Get status or default to PENDING (invited)
            const participation = rfp.eventParticipations?.[0]?.status || "PENDING";

            return {
                ...rfp,
                // Ensure prValue is extracted from additionalFields if it exists there
                prValue: addFields.budget || addFields.estimatedValue || null,
                hasResponded: rfp.quotes.length > 0,
                responseDate: rfp.quotes[0]?.createdAt || null,
                participationStatus: participation
            };
        });

        const duration = Date.now() - start;
        if (duration > 2000) {
            console.log(`[SupplierDashboard] Slow query: ${duration}ms`);
        }

        return NextResponse.json(parsedRfps);

    } catch (error: any) {
        console.error("Error fetching supplier dashboard:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
