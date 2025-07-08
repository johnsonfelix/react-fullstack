import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      procurementRequestId,
      evaluationDetails,
      sections,
    } = body;

    if (!procurementRequestId) {
      return NextResponse.json({ error: "procurementRequestId is required" }, { status: 400 });
    }

    // Update evaluation period on ProcurementRequest
    await prisma.procurementRequest.update({
      where: { id: procurementRequestId },
      data: {
        evaluationDetails: evaluationDetails ?? {},
      },
    });

    // Remove existing EvaluationSections and EvaluationItems for clean overwrite
    const existingSections = await prisma.evaluationSection.findMany({
      where: { procurementRequestId },
      select: { id: true },
    });

    const sectionIds = existingSections.map(sec => sec.id);

    // Delete EvaluationItems first to avoid foreign key constraints
    await prisma.evaluationItem.deleteMany({
      where: { evaluationSectionId: { in: sectionIds } },
    });

    await prisma.evaluationSection.deleteMany({
      where: { procurementRequestId },
    });

    // Create new EvaluationSections and EvaluationItems with subQuestions
    for (const section of sections) {
      const createdSection = await prisma.evaluationSection.create({
        data: {
          title: section.title,
          weightPercentage: section.weightPercentage,
          useLineLevelWeighting: section.useLineLevelWeighting,
          procurementRequestId,
        },
      });

      if (section.useLineLevelWeighting && section.lineLevelWeights?.length > 0) {
        for (const item of section.lineLevelWeights) {
          // Create parent question item
          const createdItem = await prisma.evaluationItem.create({
            data: {
              description: item.text,
              weightPercentage: item.weightPercentage,
              evaluationSectionId: createdSection.id,
            },
          });

          // Create sub-questions if present
          if (item.subQuestions && item.subQuestions.length > 0) {
            for (const sub of item.subQuestions) {
              await prisma.evaluationItem.create({
                data: {
                  description: sub.text,
                  weightPercentage: sub.weightPercentage,
                  evaluationSectionId: createdSection.id,
                },
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving evaluation data:", error);
    return NextResponse.json({ error: "Server error", detail: String(error) }, { status: 500 });
  }
}
