import prisma from "@/app/prisma";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
  include: {
    user: true,
    group: {
      include: {
        subcategories: true, // ✅ This works because `subcategories` is a self-relation
      },
    },
  },
});

  return NextResponse.json(suppliers);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      username,
      password,
      email,
      state,
      city,
      zipcode,
      status,
    } = body;

    // 1. Create Supplier first
    const supplier = await prisma.supplier.create({
      data: {
        name,
        state,
        city,
        zipcode,
        status,
      },
    });

    const hashedPassword = await hash(password, 10); 

    // 2. Create User and connect with supplier
    await prisma.user.create({
      data: {
        username,
        password:hashedPassword, // Ideally hash password before saving (bcrypt)
        email,
        type: "SUPPLIER",
        supplierId: supplier.id,
        profileCompleted: true
      },
    });

    return NextResponse.json({ message: "Supplier created successfully" }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: "Error creating supplier", error: error.message }, { status: 500 });
  }
}
