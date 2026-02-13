
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/app/prisma";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get supplier ID from user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { supplier: true },
        });

        if (!user?.supplier) {
            return NextResponse.json({ error: "Supplier profile not found" }, { status: 404 });
        }

        const items = await prisma.catalogItem.findMany({
            where: { supplierId: user.supplier.id },
            include: {
                category: true,
                uom: true,
                currency: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(items);
    } catch (error) {
        console.error("Error fetching catalog:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { supplier: true },
        });

        if (!user?.supplier) {
            return NextResponse.json({ error: "Supplier profile not found" }, { status: 404 });
        }

        const body = await req.json();
        const { itemType, description, categoryId, quantity, uomId, price, currencyId, imageUrl } = body;

        if (!itemType || !description || !categoryId || !quantity || !uomId || !price || !currencyId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newItem = await prisma.catalogItem.create({
            data: {
                supplierId: user.supplier.id,
                itemType,
                description,
                categoryId,
                quantity: Number(quantity),
                uomId,
                price: Number(price),
                currencyId,
                imageUrl,
            },
        });

        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error("Error creating catalog item:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
