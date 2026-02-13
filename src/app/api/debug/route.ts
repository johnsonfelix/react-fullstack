
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET() {
    try {
        const currencies = await prisma.currency.findMany();
        const uoms = await prisma.uom.findMany();
        const categories = await prisma.productCategory.findMany();

        return NextResponse.json({
            currencies,
            uoms,
            categories
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
