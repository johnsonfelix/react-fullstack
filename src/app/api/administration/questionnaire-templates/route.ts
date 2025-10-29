// /app/api/administration/questionnaire-templates/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";
import fs from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";

type IncomingAttachment = { filename?: string; url?: string; data?: string; mimeType?: string };
type IncomingQuestion = {
  text: string;
  description?: string | null;
  type?: string;
  required?: boolean;
  order?: number;
  options?: any;
  attachments?: IncomingAttachment[] | string[];
  subQuestions?: IncomingQuestion[];
  // optional: allow attaching a category id to a question (matches schema)
  categoryId?: string | null;
};

// Persist base64 attachments -> returns array of URL strings
async function persistAttachmentsForQuestion(q: IncomingQuestion): Promise<string[]> {
  if (!q.attachments || (Array.isArray(q.attachments) && q.attachments.length === 0)) return [];

  const uploadDir = path.join(process.cwd(), "public", "uploads", "questionnaire");
  await fs.mkdir(uploadDir, { recursive: true });

  const outUrls: string[] = [];

  if (Array.isArray(q.attachments) && q.attachments.every((a) => typeof a === "string")) {
    return q.attachments as string[];
  }

  for (const att of (q.attachments as IncomingAttachment[]) || []) {
    if (!att) continue;
    if (typeof att === "string") {
      outUrls.push(att);
      continue;
    }
    if (att.url && !att.data) {
      outUrls.push(att.url);
      continue;
    }
    if (!att.data) continue;

    const parts = att.data.split("base64,");
    if (parts.length !== 2) continue;
    const prefix = parts[0];
    const b64 = parts[1];
    const mimeMatch = prefix.match(/^data:([^;]+);/);
    const mime = mimeMatch?.[1] ?? att.mimeType ?? "application/octet-stream";
    const ext = (mime.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 6) || "bin";

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(uploadDir, safeName);
    const buffer = Buffer.from(b64, "base64");
    await fs.writeFile(filePath, buffer);
    outUrls.push(`/uploads/questionnaire/${safeName}`);
  }

  return outUrls;
}

function toQuestionCreatePayload(q: IncomingQuestion, idxOrder = 0) {
  const payload: any = {
    text: q.text,
    description: q.description ?? null,
    type: q.type ?? "text",
    required: !!q.required,
    order: typeof q.order === "number" ? q.order : idxOrder,
    options: typeof q.options !== "undefined" ? q.options : null,
    attachments: Array.isArray(q.attachments) ? (q.attachments as string[]) : [],
    // pass through question-level category if provided
    categoryId: q.categoryId ?? null,
  };
  return payload;
}

// Helper: build a nested include to 3 levels deep (top-level -> subQuestions -> subQuestions)
const QUESTION_NESTED_INCLUDE = {
  questions: {
    where: { parentQuestionId: null },        // top-level only
    orderBy: { order: "asc" },
    include: {
      subQuestions: {
        orderBy: { order: "asc" },
        include: {
          subQuestions: {
            orderBy: { order: "asc" },
            include: {
              subQuestions: {
                orderBy: { order: "asc" }
              }
            }
          }
        }
      }
    }
  }
} as Prisma.QuestionnaireTemplateInclude;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      questions,
      categoryId,
      categoryName,
    } = body as {
      name?: string;
      description?: string | null;
      questions?: IncomingQuestion[];
      categoryId?: string | null;
      categoryName?: string | null;
    };

    if (!name || !name.trim()) return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    if (!Array.isArray(questions) || questions.length === 0) return NextResponse.json({ error: "At least one question is required" }, { status: 400 });

    // CATEGORY handling: either categoryId (existing) OR categoryName (find/create)
    if (!categoryId && !categoryName) {
      return NextResponse.json({ error: "categoryId or categoryName is required" }, { status: 400 });
    }

    const trimmedCategoryName = typeof categoryName === "string" ? categoryName.trim() : null;
    if (!categoryId && !trimmedCategoryName) {
      return NextResponse.json({ error: "categoryId or categoryName is required" }, { status: 400 });
    }

    let category = null;
    if (categoryId) {
      category = await prisma.questionnaireCategory.findUnique({ where: { id: categoryId } });
      if (!category) return NextResponse.json({ error: "Provided categoryId not found" }, { status: 400 });
    } else if (trimmedCategoryName) {
      category = await prisma.questionnaireCategory.findFirst({ where: { name: trimmedCategoryName } });
      if (!category) {
        category = await prisma.questionnaireCategory.create({ data: { name: trimmedCategoryName } });
      }
    }

    

    // persist attachments (in-place) and convert each question.attachments -> string[]
    async function walkAndPersist(qs?: IncomingQuestion[]) {
      if (!qs) return;
      for (const q of qs) {
        if (q.attachments && q.attachments.length) {
          const urls = await persistAttachmentsForQuestion(q);
          q.attachments = urls;
        } else {
          q.attachments = [];
        }
        if (q.subQuestions && q.subQuestions.length) {
          await walkAndPersist(q.subQuestions);
        }
      }
    }
    await walkAndPersist(questions);
    
// 1) create the template connected to the category
    const template = await prisma.questionnaireTemplate.create({
      data: {
        name: name.trim(),
        description: description ?? null,
        category: { connect: { id: category.id } }, // category guaranteed non-null here
      },
    });

    // 2) recursively create QuestionnaireQuestion rows — build explicit create data (avoid passing both scalar FK and relation)
    async function createQuestionsRecursive(qs: IncomingQuestion[], parentQuestionId: string | null = null) {
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        const payload = toQuestionCreatePayload(q, i);

        // build explicit data object instead of spreading payload
        const questionData: any = {
          text: payload.text,
          description: payload.description,
          type: payload.type,
          required: payload.required,
          order: payload.order,
          options: payload.options,
          attachments: payload.attachments || [],
          template: { connect: { id: template.id } },
        };

        if (parentQuestionId) {
          questionData.parentQuestion = { connect: { id: parentQuestionId } };
        }

        // If question has a categoryId, connect via relation (don't also set scalar categoryId)
        if (payload.categoryId) {
          const qCat = await prisma.questionnaireCategory.findUnique({ where: { id: payload.categoryId } });
          if (qCat) {
            questionData.category = { connect: { id: payload.categoryId } };
          }
        }

        const createdQ = await prisma.questionnaireQuestion.create({ data: questionData });

        if (q.subQuestions && q.subQuestions.length) {
          await createQuestionsRecursive(q.subQuestions, createdQ.id);
        }
      }
    }

    await createQuestionsRecursive(questions);

    // 3) fetch the template back including top-level questions (ordered) and category
    const created = await prisma.questionnaireTemplate.findUnique({
      where: { id: template.id },
      include: {
        category: true,
        // include nested questions (top-level -> subQuestions -> subQuestions)
        ...QUESTION_NESTED_INCLUDE,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Create template error:", err?.message ?? err, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const templates = await prisma.questionnaireTemplate.findMany({
      include: {
        category: true,
        ...QUESTION_NESTED_INCLUDE,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates, { status: 200 });
  } catch (err) {
    console.error("List templates error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
