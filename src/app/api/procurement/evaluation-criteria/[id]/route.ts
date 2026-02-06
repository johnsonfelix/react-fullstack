// app/api/procurement/evaluation-criteria/[id]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");
    const procurementRequestId = pathnameParts.at(-1); // since path = /api/procurement/evaluation-criteria/[id]

    if (!procurementRequestId) {
      return NextResponse.json(
        { error: "procurementRequestId is required" },
        { status: 400 }
      );
    }

    const procurement = await prisma.procurementRequest.findUnique({
      where: { id: procurementRequestId },
      include: {
        scopeOfWork: true,
        // scopeOfWork: {
        //   include: {
        //     questions: true,
        //   },
        // },
      },
    });

    if (!procurement) {
      return NextResponse.json(
        { error: "Procurement not found" },
        { status: 404 }
      );
    }

    // Parse evaluationDetails safely
    let evaluationStartDate = "";
    let evaluationStartTime = "";
    let evaluationEndDate = "";
    let evaluationEndTime = "";

    if (
      procurement.evaluationDetails &&
      typeof procurement.evaluationDetails === "object" &&
      !Array.isArray(procurement.evaluationDetails)
    ) {
      const details = procurement.evaluationDetails as {
        evaluationStartDate?: string;
        evaluationStartTime?: string;
        evaluationEndDate?: string;
        evaluationEndTime?: string;
      };
      evaluationStartDate = details.evaluationStartDate ?? "";
      evaluationStartTime = details.evaluationStartTime ?? "";
      evaluationEndDate = details.evaluationEndDate ?? "";
      evaluationEndTime = details.evaluationEndTime ?? "";
    }

    const evaluationSections = await prisma.evaluationSection.findMany({
      where: { procurementRequestId },
      include: {
        criteria: true,
        // items: true,
      },
    });

    let sections;

    if (evaluationSections.length > 0) {
      sections = procurement.scopeOfWork.map((sw: any) => {
        const evalSection = evaluationSections.find(
          (es) => es.title === sw.text
        );

        // const parentQuestions = sw.questions.filter(
        //   (q) => q.parentQuestionId === null
        // );
        const parentQuestions: any[] = [];

        const lineLevelWeights = parentQuestions.map((parentQ) => {
          const savedItem = (evalSection as any)?.criteria?.find(
            (item: any) => item.question === parentQ.text
          );

          return {
            id: savedItem ? savedItem.id : parentQ.id,
            text: parentQ.text,
            weightPercentage: savedItem ? savedItem.maxScore : 0, // Mapped maxScore to weightPercentage
            subQuestions: [],
          };
        });

        return {
          id: evalSection ? evalSection.id : sw.id,
          title: sw.text,
          weightPercentage: evalSection ? evalSection.weight : 0,
          useLineLevelWeighting: false, // Field does not exist
          lineLevelWeights,
        };
      });
    } else {
      sections = procurement.scopeOfWork.map((sw) => {
        // const parentQuestions = sw.questions.filter(
        //   (q) => q.parentQuestionId === null
        // );
        const parentQuestions: any[] = [];

        const lineLevelWeights = parentQuestions.map((parent) => ({
          id: parent.id,
          text: parent.text,
          weightPercentage: 0,
          subQuestions: [],
        }));

        return {
          id: sw.id,
          title: sw.text, // Mapped sw.text
          weightPercentage: 0,
          useLineLevelWeighting: false,
          lineLevelWeights,
        };
      });
    }

    return NextResponse.json({
      evaluationStartDate,
      evaluationStartTime,
      evaluationEndDate,
      evaluationEndTime,
      sections,
    });
  } catch (error) {
    console.error("Error loading evaluation data:", error);
    return NextResponse.json(
      { error: "Server error", detail: String(error) },
      { status: 500 }
    );
  }
}
