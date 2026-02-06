
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";
import { sendSupplierInvitation } from "@/lib/mail";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        // 1. Fetch RFP and Suppliers
        const rfp = await prisma.procurementRequest.findUnique({
            where: { id },
            include: { suppliers: true } // Assuming 'suppliers' is the relation to assumed selected suppliers
        });

        if (!rfp) {
            return NextResponse.json({ error: "RFP not found" }, { status: 404 });
        }

        if (!rfp.suppliers || rfp.suppliers.length === 0) {
            return NextResponse.json({ error: "No suppliers selected for this RFP" }, { status: 400 });
        }

        // 2. Send Emails
        let sentCount = 0;
        // Mock link for now - typically /public/rfp/[id] or /supplier/dashboard
        const publicLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/supplier/rfp/${rfp.id}`;

        for (const supplier of rfp.suppliers) {
            if (supplier.registrationEmail) {
                await sendSupplierInvitation(
                    supplier.registrationEmail,
                    supplier.companyName,
                    rfp.title,
                    publicLink
                );
                sentCount++;
            }
        }

        // 3. Update Status
        await prisma.procurementRequest.update({
            where: { id },
            data: { status: "PUBLISHED" }
        });

        return NextResponse.json({
            success: true,
            message: `Published to ${sentCount} suppliers`,
            sentCount
        });

    } catch (error) {
        console.error("Publish Error:", error);
        return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
    }
}
