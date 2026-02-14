
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

        // Simple singularization: if query ends in 's', try searching without it
        const singularQuery = query.toLowerCase().endsWith('s') ? query.slice(0, -1) : query;

        const items = await prisma.catalogItem.findMany({
            where: {
                OR: [
                    { description: { contains: query, mode: "insensitive" } },
                    { description: { contains: singularQuery, mode: "insensitive" } }, // Check singular
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
            take: 50
        });

        return NextResponse.json({ items });
    } catch (error) {
        console.error("Error searching catalog:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
