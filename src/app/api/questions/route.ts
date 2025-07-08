import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const question = await prisma.question.create({
    data: {
      text: body.text,
      type: body.type || "text",
      required: body.required || false,
      quantity: body.quantity || null,
      uom: body.uom || null,
      benchmark: body.benchmark || null,
      deliverableId: body.deliverableId,
      parentQuestionId: body.parentQuestionId || null,
    },
  });
  return NextResponse.json(question);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const question = await prisma.question.update({
    where: { id: body.id },
    data: {
      text: body.text,
      type: body.type,
      required: body.required,
      quantity: body.quantity,
      uom: body.uom,
      benchmark: body.benchmark,
    },
  });
  return NextResponse.json(question);
}
