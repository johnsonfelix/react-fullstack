import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

// GET: Fetch top-level categories including their subcategories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parentCategoryId: null, // Only fetch top-level categories
      },
      orderBy: { createdAt: "asc" },
      include: {
        subcategories: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST: Create a category or subcategory
export async function POST(request) {
  try {
    const { categoryName, parentCategoryId } = await request.json();

    if (!categoryName) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const newCategory = await prisma.category.create({
      data: {
        name: categoryName,
        parentCategoryId: parentCategoryId || null,
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
