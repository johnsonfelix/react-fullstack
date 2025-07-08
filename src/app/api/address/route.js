import { NextResponse } from "next/server";
import prisma from "@/app/prisma";


export async function GET() {
    const address = await prisma.address.findMany({
      orderBy: { createdAt: "asc" },
    });
  
    return NextResponse.json(address);
  }

export async function POST(request) {
  console.log('request');
  console.log(request);
  
    try {
        const res = await request.json();
        const { street, city, state, zipCode, country } = res;

        const result = await prisma.address.create({
            data: { street, city, state, zipCode, country }
        });

        return NextResponse.json({ result }, { status: 201 });
    } catch (error) {
        console.error("Error creating address:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
