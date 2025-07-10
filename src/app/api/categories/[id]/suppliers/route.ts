import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET(req: NextRequest) {
  try {
    const { pathname } = new URL(req.url);
    const id = pathname.split("/").at(-2); // extracts [id] from /api/categories/[id]/suppliers

    if (!id) {
      return NextResponse.json({ message: "Category ID is required" }, { status: 400 });
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        group: {
          some: {
            id,
          },
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers for category:", error);
    return NextResponse.json({ message: "Failed to fetch suppliers" }, { status: 500 });
  }
}
