// src/app/api/suppliers/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");
    const id = pathnameParts.at(-1);

    if (!id) {
      return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return NextResponse.json({ error: "Failed to fetch supplier" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");
    const supplierId = pathnameParts.at(-1);

    if (!supplierId) {
      return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });
    }

    // 1. Delete the associated user (FK constraint safe)
    await prisma.user.deleteMany({
      where: { supplierId },
    });

    // 2. Delete the supplier
    await prisma.supplier.delete({
      where: { id: supplierId },
    });

    return NextResponse.json({ message: "Supplier and User deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");
    const id = pathnameParts.at(-1);

    if (!id) {
      return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });
    }

    const { categoryId } = await req.json();

    if (!categoryId) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    await prisma.supplier.update({
      where: { id },
      data: {
        group: {
          connect: { id: categoryId },
        },
      },
    });

    return NextResponse.json({ message: "Category added to supplier" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to add category" }, { status: 500 });
  }
}
