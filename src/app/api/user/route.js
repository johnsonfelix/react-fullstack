import prisma from "@/app/prisma";
import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import * as z from 'zod';

const userSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string()
    .min(1, 'Password is required')
    .min(8, 'Password must have more than 8 characters'),
  type: z.string().min(1, 'Type is required'), // Ensure `type` is validated here
});

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('Request Body:', body);

    const { email, username, type, password } = userSchema.parse(body);

    if (!email || !username || !password) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 409 });
    }

    const hashedPassword = await hash(password, 10); 

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        type, // Pass `type` field to Prisma model
        password: hashedPassword,
      },
    });

    const { password: newUserPassword, ...rest } = newUser;

    return NextResponse.json({ message: "User created", user: rest }, { status: 201 });

  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
