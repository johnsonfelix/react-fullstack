// app/api/procurement/[id]/suppliers/route.ts

import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");
    const id = pathnameParts.at(-2); // because path is /api/procurement/[id]/suppliers

    if (!id) {
      return NextResponse.json({ error: "ID parameter missing in URL" }, { status: 400 });
    }

    const procurement = await prisma.procurementRequest.findUnique({
      where: { id },
      include: {
        suppliers: {
          include: { user: true },
        },
      },
    });

    if (!procurement) {
      return NextResponse.json({ error: "Procurement not found" }, { status: 404 });
    }

    return NextResponse.json(procurement.suppliers, { status: 200 });
  } catch (error) {
    console.error("Error fetching suppliers for procurement:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
