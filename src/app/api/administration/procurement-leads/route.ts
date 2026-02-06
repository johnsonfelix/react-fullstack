import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET() {
    try {
        const leads = await prisma.procurementLead.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(leads);
    } catch (error) {
        console.error("Error fetching procurement leads:", error);
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, department } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const lead = await prisma.procurementLead.create({
            data: { name, email, department },
        });

        return NextResponse.json(lead);
    } catch (error) {
        console.error("Error creating procurement lead:", error);
        return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    }
}
