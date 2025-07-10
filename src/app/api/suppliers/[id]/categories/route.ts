// app/api/suppliers/[id]/categories/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");
    const id = pathnameParts.at(-2); // suppliers/[id]/categories

    if (!id) {
      return NextResponse.json({ error: "Supplier id is required" }, { status: 400 });
    }

    const { categoryId, subcategoryIds } = await req.json();

    if (!categoryId) {
      return NextResponse.json({ error: "CategoryId is required" }, { status: 400 });
    }

    // Ensure subcategoryIds are valid children of the selected category
    const validSubcategories = subcategoryIds?.length
      ? await prisma.category.findMany({
          where: {
            id: { in: subcategoryIds },
            parentCategoryId: categoryId, // ✅ enforce correct parent-child relationship
          },
          select: { id: true },
        })
      : [];

    const connectCategories = [
      { id: categoryId },
      ...validSubcategories.map((sub) => ({ id: sub.id })),
    ];

    await prisma.supplier.update({
      where: { id },
      data: {
        group: {
          connect: connectCategories,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding categories to supplier:", error);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(error) },
      { status: 500 }
    );
  }
}
