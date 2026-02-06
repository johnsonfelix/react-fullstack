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
    await prisma.evaluationCriterion.deleteMany({
      where: { sectionId: { in: sectionIds } },
    });

    await prisma.evaluationSection.deleteMany({
      where: { procurementRequestId },
    });

    // Create new EvaluationSections and EvaluationItems
    for (const section of sections) {
      const createdSection = await prisma.evaluationSection.create({
        data: {
          title: section.title,
          weight: section.weightPercentage || 0, // Map weightPercentage to weight
          // useLineLevelWeighting: section.useLineLevelWeighting, // Removed as not in schema
          procurementRequestId,
        },
      });

      if (section.lineLevelWeights?.length > 0) {
        for (const item of section.lineLevelWeights) {
          // Create criterion
          await prisma.evaluationCriterion.create({
            data: {
              question: item.text, // Map description/text to question
              maxScore: item.weightPercentage || 10, // Map weightPercentage to maxScore
              sectionId: createdSection.id,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving evaluation data:", error);
    return NextResponse.json({ error: "Server error", detail: String(error) }, { status: 500 });
  }
}
