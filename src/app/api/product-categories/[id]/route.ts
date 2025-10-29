// app/api/product-categories/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

/** Extract last path segment as id (robust and avoids Next's route typing mismatch). */
function extractIdFromRequest(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;
    return segments[segments.length - 1];
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const id = extractIdFromRequest(req);
  if (!id) return NextResponse.json({ error: "Missing id in URL" }, { status: 400 });

  try {
    const cat = await prisma.productCategory.findUnique({ where: { id } });
    if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(cat);
  } catch (err) {
    console.error("GET /api/product-categories/[id] error", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const id = extractIdFromRequest(req);
  if (!id) return NextResponse.json({ error: "Missing id in URL" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const { categoryName, parentCategoryId, description } = body as {
      categoryName?: unknown;
      parentCategoryId?: unknown;
      description?: unknown;
    };

    const dataToUpdate: any = {};
    if (categoryName !== undefined) {
      if (!categoryName || typeof categoryName !== "string") {
        return NextResponse.json({ error: "Invalid categoryName" }, { status: 400 });
      }
      dataToUpdate.name = categoryName.trim();
    }
    if (parentCategoryId !== undefined) {
      // allow null to unset parent
      dataToUpdate.parentId = parentCategoryId === null ? null : String(parentCategoryId);
    }
    if (description !== undefined) {
      dataToUpdate.description = description === null ? null : String(description);
    }

    const updated = await prisma.productCategory.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("PATCH /api/product-categories/[id] error", err);
    // Prisma record not found
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const id = extractIdFromRequest(req);
  if (!id) return NextResponse.json({ error: "Missing id in URL" }, { status: 400 });

  try {
    // Optional protection: Uncomment to require no children before deletion
    // const children = await prisma.productCategory.findMany({ where: { parentId: id } });
    // if (children.length > 0) return NextResponse.json({ error: "Remove subcategories first" }, { status: 400 });

    await prisma.productCategory.delete({ where: { id } });
    // Return 204 no content or a short JSON message. Many clients expect 204 for deletes:
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("DELETE /api/product-categories/[id] error", err);
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
