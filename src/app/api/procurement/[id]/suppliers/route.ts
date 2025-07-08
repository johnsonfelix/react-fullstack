// pages/api/procurements/[id]/suppliers.ts

import prisma from "@/app/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const procurement = await prisma.procurementRequest.findUnique({
      where: { id },
      include: {
        suppliers: {
          include: { user: true }
        }
      }
    });

    if (!procurement) {
      return NextResponse.json({ error: "Procurement not found" }, { status: 404 });
    }

    return NextResponse.json(procurement.suppliers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
