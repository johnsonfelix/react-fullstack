// /app/api/supplier-registration/questionnaire/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    // 1) Load categories + templates + questions
    // We want categories ordered and templates with their questions
    const categories = await prisma.questionnaireCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        templates: {
          where: { isActive: true },
          include: {
            questions: {
              include: { category: true },
              orderBy: { order: "asc" }, // optional ordering
            },
          },
        },
      },
    });

    // Flatten and sanitize questions shape for client
    const categoriesOut = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      order: cat.order,
      templates: (cat.templates || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? null,
        isActive: t.isActive,
        questions: (t.questions || []).map((q: any) => ({
          id: q.id,
          text: q.text,
          description: q.description ?? null,
          type: q.type ?? "text",
          required: !!q.required,
          options: q.options ?? null,       // Prisma returns JSON -> as JS value
          validation: q.validation ?? null, // JSON
          parentQuestionId: q.parentQuestionId ?? null,
          order: q.order ?? 0,
          templateId: t.id,
          categoryId: cat.id,
          categoryName: cat.name,
          attachments: q.attachments ?? [], // if you store attachments on questions
        })),
      })),
    }));

    // 2) Optionally return all active templates (if you prefer)
    // const templates = categories.flatMap((c) => c.templates)

    // 3) If email provided, collect saved answers for that supplier
    let answersMap: Record<string, any> = {};
    if (email) {
      const supplier = await prisma.supplier.findUnique({ where: { registrationEmail: email } });
      if (supplier) {
        const answers = await prisma.questionnaireAnswer.findMany({
          where: { supplierId: supplier.id },
        });
        for (const a of answers) {
          answersMap[a.questionId] = a.answer;
        }

        // Also include questionnaireResponse fields if you use that relation:
        const qr = await prisma.questionnaireResponse.findUnique({ where: { supplierId: supplier.id } }).catch(() => null);
        if (qr) {
          // Map top-level boolean fields into special key so UI can read them if needed
          answersMap["__questionnaireResponse__"] = {
            hasQualityManagementSystem: !!qr.hasQualityManagementSystem,
            hasEnvironmentalCertification: !!qr.hasEnvironmentalCertification,
            hasHealthSafetyCertification: !!qr.hasHealthSafetyCertification,
            acceptsTermsAndConditions: !!qr.acceptsTermsAndConditions,
            // more fields as needed...
          };
        }
      }
    }

    // 4) optional flat question list (makes migrations easier on client)
    const questionsFlat = categoriesOut.flatMap((c) => c.templates.flatMap((t) => t.questions));

    return NextResponse.json({
      categories: categoriesOut,
      questionsFlat,
      answers: answersMap,
    }, { status: 200 });

  } catch (err) {
    console.error("Questionnaire route error:", err);
    return NextResponse.json({ error: "Failed to load questionnaire template." }, { status: 500 });
  }
}
