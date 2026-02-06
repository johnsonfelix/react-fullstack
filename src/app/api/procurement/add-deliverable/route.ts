import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rfpId, title, description } = body;

    // Create the deliverable and attach to ProcurementRequest
    const deliverable = await prisma.scopeOfWorkDeliverable.create({
      data: {
        text: title,
        // title,
        // description,
        procurementRequest: { connect: { id: rfpId } },
      },
    });

    return NextResponse.json({ success: true, deliverable });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to add deliverable" }, { status: 500 });
  }
}
