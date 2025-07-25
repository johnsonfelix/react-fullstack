import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET(req: NextRequest) {
  // Extract the id from the URL path
  const id = req.nextUrl.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ error: "No id provided." }, { status: 400 });
  }

  try {
    const procurement = await prisma.procurementRequest.findUnique({
      where: { id },
      include: { scopeOfWork: true, items: true, suppliers: true },
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
