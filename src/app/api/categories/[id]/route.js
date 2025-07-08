import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
  const { id } = params;

  await prisma.category.delete({
    where: { id },
  });

  return NextResponse.json({ message: "Category deleted successfully" });
}

export async function GET(req, { params }) {
  const { id } = await params;

  try {
    const supplier = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 });
  }
}
