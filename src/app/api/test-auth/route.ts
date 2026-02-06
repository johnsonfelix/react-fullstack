
import prisma from "@/app/prisma";
import { compare } from "bcrypt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const passwordMatch = await compare(password, existingUser.password);

        if (!passwordMatch) {
            return NextResponse.json({ error: "Password incorrect" }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: existingUser.id,
                email: existingUser.email,
                username: existingUser.username
            }
        });

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
