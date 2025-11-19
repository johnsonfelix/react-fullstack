import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const carrier = await prisma.carrier.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(carrier);
}

export async function POST(request) {
  const { itemName } = await request.json();
  

  if (!itemName) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const newItem = await prisma.carrier.create({
    data: {
      name: itemName,
    },
  });

  return NextResponse.json(newItem, { status: 201 });
}