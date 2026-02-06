import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, email, department, isActive } = body;

        const lead = await prisma.procurementLead.update({
            where: { id },
            data: { name, email, department, isActive },
        });

        return NextResponse.json(lead);
    } catch (error) {
        console.error("Error updating procurement lead:", error);
        return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        // Soft delete
        const lead = await prisma.procurementLead.update({
            where: { id },
            data: { isActive: false }
        });
        return NextResponse.json(lead);
    } catch (error) {
        console.error("Error deleting procurement lead:", error);
        return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
    }
}
