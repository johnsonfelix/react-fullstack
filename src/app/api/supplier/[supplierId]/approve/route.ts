import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";
import { hash } from "bcrypt";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ supplierId: string }> }
) {
    try {
        const { supplierId } = await params;

        const supplier = await prisma.supplier.update({
            where: { id: supplierId },
            data: { status: "Active" },
        });

        // Create User account if it doesn't exist
        const defaultPassword = "Password@123";
        const hashedPassword = await hash(defaultPassword, 10);

        const existingUser = await prisma.user.findFirst({
            where: { supplierId: supplier.id }
        });

        if (!existingUser) {
            await prisma.user.create({
                data: {
                    username: supplier.registrationEmail.split('@')[0] + "_" + Math.floor(Math.random() * 1000),
                    email: supplier.registrationEmail,
                    password: hashedPassword,
                    type: "SUPPLIER",
                    supplierId: supplier.id,
                }
            });
        }

        return NextResponse.json(supplier);
    } catch (error: any) {
        console.error("Error approving supplier:", error);
        return NextResponse.json(
            { error: "Failed to approve supplier" },
            { status: 500 }
        );
    }
}
