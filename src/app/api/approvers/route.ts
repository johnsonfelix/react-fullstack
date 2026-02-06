
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

// GET: List all approvers
export async function GET() {
    try {
        const approvers = await prisma.approver.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(approvers);
    } catch (error) {
        console.error("Error fetching approvers:", error);
        return NextResponse.json({ error: "Failed to fetch approvers" }, { status: 500 });
    }
}

// POST: Create a new approver
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, role } = body;

        if (!name || !email || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Logic:
        // 1. Check if User exists by email
        // 2. If yes, link to that User. 
        // 3. If no, create User (default pwd) and link.

        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // Create new User
            // Note: In production, use bcrypt/argon2 for password hashing.
            // For prototype, storing plain text or simple hash? 
            // The existing User model has `password`. Assuming plain for now based on context, or hashed if bcrypt used elsewhere.
            // We'll use a placeholder hash or plain text per user environment.
            // Default password: Password@123
            const { hash } = await import("bcrypt");
            const hashedPassword = await hash("Password@123", 10);

            user = await prisma.user.create({
                data: {
                    email,
                    username: email.split('@')[0], // Generate username from email
                    password: hashedPassword,
                    type: "APPROVER",
                    profileCompleted: true
                }
            });
        } else {
            // User exists, we must ensure they can login with the default password as an approver.
            // Reset password to default: Password@123
            const { hash } = await import("bcrypt");
            const hashedPassword = await hash("Password@123", 10);

            user = await prisma.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    type: "APPROVER",
                }
            });
        }

        const newApprover = await prisma.approver.create({
            data: {
                name,
                email,
                role,
                userId: user.id
            },
        });

        return NextResponse.json(newApprover, { status: 201 });
    } catch (error) {
        console.error("Error creating approver:", error);
        return NextResponse.json({ error: "Failed to create approver. Email might be in use." }, { status: 500 });
    }
}

// DELETE: Remove an approver (optional, passing ID via query param)
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        await prisma.approver.delete({
            where: { id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
