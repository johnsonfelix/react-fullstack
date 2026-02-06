
import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                password: true, // Be careful exposing this, but for internal debug it's useful to see if it's hashed
                username: true
            },
            take: 5
        });
        return NextResponse.json({ count: users.length, users });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
