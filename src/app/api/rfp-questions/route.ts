import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { deliverableId, rfpId, questions } = body;

  try {
    await prisma.question.deleteMany({
      where: { deliverableId },
    });

    await prisma.$transaction(async (tx) => {
      for (const q of questions) {
        const createdParent = await tx.question.create({
          data: {
            text: q.serviceName ?? q.text, // ✅ use serviceName as text
            type: q.type,
            required: q.required,
            quantity: q.quantity ?? null,
            uom: q.uom ?? null,
            benchmark: q.benchmark ?? null,
            deliverableId,
            rfpId,
            conditionOperator: q.conditionOperator ?? null,
            conditionValue: q.conditionValue ?? null,
            serviceName: q.serviceName ?? null,
            serviceType: q.serviceType ?? null, // ✅ new
          },
        });

        // Components under Service
        if (q.components && Array.isArray(q.components)) {
          for (const c of q.components) {
            const createdComponent = await tx.question.create({
              data: {
                text: c.description || c.label || "Component",
                type: c.uom?.toLowerCase() === "yes/no" ? "yes_no" : "text",
                required: c.required,
                quantity: c.quantity ? parseInt(c.quantity) : null,
                uom: c.uom ?? null,
                benchmark: c.benchmark ?? null,
                deliverableId,
                rfpId,
                parentQuestionId: createdParent.id,
                conditionOperator: c.conditional?.operator ?? null,
                conditionValue: c.conditional?.conditionValue ?? null,
              },
            });

            if (c.conditional && c.conditional.subComponent) {
              const sub = c.conditional.subComponent;
              await tx.question.create({
                data: {
                  text: sub.description,
                  type: "text",
                  required: sub.required,
                  quantity: sub.quantity ? parseInt(sub.quantity) : null,
                  uom: sub.uom ?? null,
                  benchmark: sub.benchmark ?? null,
                  deliverableId,
                  rfpId,
                  parentQuestionId: createdComponent.id,
                },
              });
            }
          }
        }

        if (q.subQuestion) {
          const sub = q.subQuestion;
          await tx.question.create({
            data: {
              text: sub.text,
              type: sub.type,
              required: sub.required,
              quantity: sub.quantity ?? null,
              uom: sub.uom ?? null,
              benchmark: sub.benchmark ?? null,
              deliverableId,
              rfpId,
              parentQuestionId: createdParent.id,
            },
          });
        }
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
  const deliverableId = searchParams.get("deliverableId");

  if (!deliverableId) {
    return NextResponse.json({ error: "Missing deliverableId" }, { status: 400 });
  }

  const questions = await prisma.question.findMany({
    where: { deliverableId, parentQuestionId: null },
    include: {
      subQuestions: {
        include: {
          subQuestions: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(questions);
}
