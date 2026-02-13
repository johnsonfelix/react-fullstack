
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("query");

        if (!query) {
            return NextResponse.json({ items: [] });
        }

        const items = await prisma.catalogItem.findMany({
            where: {
                OR: [
                    { description: { contains: query, mode: "insensitive" } },
                    { itemType: { contains: query, mode: "insensitive" } },
                    { category: { name: { contains: query, mode: "insensitive" } } }
                ]
            },
            include: {
                supplier: {
                    select: {
                        companyName: true,
                        supplierType: true
                    }
                },
                currency: true,
                uom: true,
                category: true
            },
            take: 5
        });

        return NextResponse.json({ items });
    } catch (error) {
        console.error("Error searching catalog:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
