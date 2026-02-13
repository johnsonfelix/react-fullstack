
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/app/prisma";


export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        // Verify ownership
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { supplier: true },
        });

        const item = await prisma.catalogItem.findUnique({
            where: { id },
        });

        if (!item || item.supplierId !== user?.supplier?.id) {
            return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
        }

        const updatedItem = await prisma.catalogItem.update({
            where: { id },
            data: {
                itemType: body.itemType,
                description: body.description,
                categoryId: body.categoryId,
                quantity: Number(body.quantity),
                uomId: body.uomId,
                price: Number(body.price),
                currencyId: body.currencyId,
                imageUrl: body.imageUrl,
            },
        });

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error("Error updating catalog item:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { supplier: true },
        });

        const item = await prisma.catalogItem.findUnique({
            where: { id },
        });

        if (!item || item.supplierId !== user?.supplier?.id) {
            return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
        }

        await prisma.catalogItem.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting catalog item:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

