// app/api/product-categories/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET() {
  try {
    const cats = await prisma.productCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, parentId: true, description: true },
    });

    // Build tree
    const map = new Map<string, any>();
    cats.forEach((c) => map.set(c.id, { ...c, children: [] }));
    const roots: any[] = [];
    for (const c of cats) {
      if (c.parentId && map.get(c.parentId)) {
        map.get(c.parentId).children.push(map.get(c.id));
      } else {
        roots.push(map.get(c.id));
      }
    }

    return NextResponse.json({ tree: roots, flat: cats }, { status: 200 });
  } catch (err) {
    console.error("GET /api/product-categories error", err);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categoryName, parentCategoryId = null, description = null } = body;

    if (!categoryName || typeof categoryName !== "string") {
      return NextResponse.json({ error: "categoryName is required" }, { status: 400 });
    }

    const created = await prisma.productCategory.create({
      data: {
        name: categoryName.trim(),
        parentId: parentCategoryId ?? null,
        description: description ?? null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/product-categories error", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
