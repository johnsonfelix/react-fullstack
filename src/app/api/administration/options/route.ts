import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (!type) {
        return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    try {
        let data;
        switch (type) {
            case 'payment':
                data = await prisma.payment.findMany();
                break;
            case 'incoterms':
                data = await prisma.incoterms.findMany();
                break;
            case 'contractTemplate':
                data = await prisma.contractTemplate.findMany();
                break;
            case 'contractDuration':
                data = await prisma.contractDuration.findMany();
                break;
            case 'warrantyPeriod':
                data = await prisma.warrantyPeriod.findMany();
                break;
            case 'governingLaw':
                data = await prisma.governingLaw.findMany();
                break;
            case 'jurisdiction':
                data = await prisma.jurisdiction.findMany();
                break;
            default:
                return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch options" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, name } = body;

        if (!type || !name) {
            return NextResponse.json({ error: "Type and Name are required" }, { status: 400 });
        }

        let data;
        switch (type) {
            case 'payment':
                data = await prisma.payment.create({ data: { name } });
                break;
            case 'incoterms':
                data = await prisma.incoterms.create({ data: { name } });
                break;
            case 'contractTemplate':
                data = await prisma.contractTemplate.create({ data: { name } });
                break;
            case 'contractDuration':
                data = await prisma.contractDuration.create({ data: { name } });
                break;
            case 'warrantyPeriod':
                data = await prisma.warrantyPeriod.create({ data: { name } });
                break;
            case 'governingLaw':
                data = await prisma.governingLaw.create({ data: { name } });
                break;
            case 'jurisdiction':
                data = await prisma.jurisdiction.create({ data: { name } });
                break;
            default:
                return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create option" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
        return NextResponse.json({ error: "Type and ID are required" }, { status: 400 });
    }

    try {
        let data;
        switch (type) {
            case 'payment':
                data = await prisma.payment.delete({ where: { id } });
                break;
            case 'incoterms':
                data = await prisma.incoterms.delete({ where: { id } });
                break;
            case 'contractTemplate':
                data = await prisma.contractTemplate.delete({ where: { id } });
                break;
            case 'contractDuration':
                data = await prisma.contractDuration.delete({ where: { id } });
                break;
            case 'warrantyPeriod':
                data = await prisma.warrantyPeriod.delete({ where: { id } });
                break;
            case 'governingLaw':
                data = await prisma.governingLaw.delete({ where: { id } });
                break;
            case 'jurisdiction':
                data = await prisma.jurisdiction.delete({ where: { id } });
                break;
            default:
                return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete option" }, { status: 500 });
    }
}
