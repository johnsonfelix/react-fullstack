import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { deliverableId, rfpId, questions } = body;

  try {
    await prisma.question.deleteMany({
      // where: { deliverableId },
      where: { procurementRequestId: rfpId },
    });

    await prisma.$transaction(async (tx) => {
      for (const q of questions) {
        await tx.question.create({
          data: {
            text: q.serviceName ?? q.text,
            type: q.type,
            required: q.required,
            procurementRequestId: rfpId,
            order: 0, // Default order
          },
        });
        // Removed unsupported nested questions and components logic
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error bulk-creating questions:", error);
    return NextResponse.json(
      { error: "Failed to save questions" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rfpId = searchParams.get("rfpId") || searchParams.get("procurementRequestId");

  if (!rfpId) {
    return NextResponse.json({ error: "Missing rfpId" }, { status: 400 });
  }

  const questions = await prisma.question.findMany({
    where: { procurementRequestId: rfpId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(questions);
}
