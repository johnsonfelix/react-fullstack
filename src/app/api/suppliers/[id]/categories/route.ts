import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { categoryId, subcategoryIds } = await req.json();

  // Ensure subcategoryIds are valid children of the selected category
  const validSubcategories = subcategoryIds?.length
    ? await prisma.category.findMany({
        where: {
          id: { in: subcategoryIds },
          parentCategoryId: categoryId, // ✅ Enforces correct parent-child relationship
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
}
