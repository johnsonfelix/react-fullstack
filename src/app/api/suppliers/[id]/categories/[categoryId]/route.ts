// app/api/suppliers/[id]/categories/[categoryId]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");

    // Extract [id] and [categoryId] from the URL
    const categoryId = pathnameParts.at(-1); // last part
    const id = pathnameParts.at(-3);         // third last part

    if (!id || !categoryId) {
      return NextResponse.json(
        { error: "Both supplier id and categoryId are required" },
        { status: 400 }
      );
    }

    await prisma.supplier.update({
      where: { id },
      data: {
        group: {
          disconnect: { id: categoryId },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting supplier from category:", error);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(error) },
      { status: 500 }
    );
  }
}
