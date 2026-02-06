
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { rfpId, status } = await req.json();

        if (!rfpId || !status || !['ACCEPTED', 'DECLINED'].includes(status)) {
            return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
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

        // Check if invited
        const rfp = await prisma.procurementRequest.findFirst({
            where: {
                id: rfpId,
                suppliers: { some: { id: supplierId } }
            }
        });

        if (!rfp) {
            return NextResponse.json({ error: "Access denied or RFP not found" }, { status: 403 });
        }

        // Upsert Participation
        const participation = await prisma.eventParticipation.upsert({
            where: {
                supplierId_procurementRequestId: {
                    supplierId,
                    procurementRequestId: rfpId
                }
            },
            update: {
                status,
                responseDate: new Date()
            },
            create: {
                supplierId,
                procurementRequestId: rfpId,
                status
            }
        });

        return NextResponse.json(participation);

    } catch (error: any) {
        console.error("Error acknowledging RFP:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
