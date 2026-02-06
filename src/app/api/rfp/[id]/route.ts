import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Extract the id from the route params (Next.js 15+ compatible)
  const { id } = await params;

  console.log("Fetching RFP with ID:", id);

  if (!id) {
    return NextResponse.json({ error: "No id provided." }, { status: 400 });
  }

  try {
    // Temporary fix for "cached plan must not change result type" error handling schema changes in connection pool
    await prisma.$executeRawUnsafe('DEALLOCATE ALL');

    const procurement = await prisma.procurementRequest.findUnique({
      where: { id },
      include: {
        scopeOfWork: true,
        items: true,
        suppliers: true,
        collaborators: true,
        approval: { include: { steps: { orderBy: { order: 'asc' } } } },
        quotes: { include: { items: true } },
        rfpResponses: true
      },
    });

    if (!procurement) {
      return NextResponse.json({ error: "RFP not found." }, { status: 404 });
    }

    return NextResponse.json(procurement);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
