// app/api/administration/questionnaire-templates/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";
import fs from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";

type IncomingAttachment = {
  filename?: string;
  url?: string;
  data?: string;
  mimeType?: string;
};

type IncomingQuestion = {
  text: string;
  description?: string | null;
  type?: string;
  required?: boolean;
  order?: number;
  options?: any;
  attachments?: IncomingAttachment[] | string[];
  subQuestions?: IncomingQuestion[];
  categoryId?: string | null;
  validation?: any;
  conditionalOn?: string | null;
};

// Modified to handle both local (dev) and S3 (production) attachments
async function persistAttachmentsForQuestion(q: IncomingQuestion): Promise<string[]> {
  if (!q.attachments || (Array.isArray(q.attachments) && q.attachments.length === 0)) return [];

  const outUrls: string[] = [];

  // If already an array of strings (URLs), return as-is
  if (Array.isArray(q.attachments) && q.attachments.every((a) => typeof a === "string")) {
    return q.attachments as string[];
  }

  for (const att of (q.attachments as IncomingAttachment[]) || []) {
    if (!att) continue;
    
    // If it's already a string URL, use it
    if (typeof att === "string") {
      outUrls.push(att);
      continue;
    }
    
    // ✅ FIX: If attachment has S3 URL (no data), use it directly
    if (att.url && !att.data) {
      outUrls.push(att.url);
      continue;
    }
    
    // ✅ FIX: Only persist base64 if NOT in production (Amplify)
    // Check if we're in a serverless/read-only environment
    const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL;
    
    if (att.data && !isServerless) {
      // Local development: save to /public/uploads
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "questionnaire");
        await fs.mkdir(uploadDir, { recursive: true });

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
      } catch (err) {
        console.error("Failed to persist attachment locally:", err);
        // Skip this attachment if it fails
        continue;
      }
    } else if (att.data && isServerless) {
      // ⚠️ Production: base64 data should have been uploaded to S3 already
      console.warn("Base64 data received in serverless environment but no URL provided. Skipping attachment.");
      // You should handle this on the client side - upload to S3 first, then send URL
      continue;
    }
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
    categoryId: q.categoryId ?? null,
    validation: q.validation ?? null,
  };
  return payload;
}

const QUESTION_NESTED_INCLUDE = {
  questions: {
    where: { parentQuestionId: null },
    orderBy: { order: "asc" },
    include: {
      subQuestions: {
        orderBy: { order: "asc" },
        include: {
          subQuestions: {
            orderBy: { order: "asc" },
            include: {
              subQuestions: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  },
} as Prisma.QuestionnaireTemplateInclude;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      sections,
      questions,
      categoryId,
      categoryName,
    } = body as {
      name?: string;
      description?: string | null;
      sections?: { questions: IncomingQuestion[] }[];
      questions?: IncomingQuestion[];
      categoryId?: string | null;
      categoryName?: string | null;
    };

    if (!name || !name.trim())
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });

    // Flatten questions from sections OR legacy questions
    let incomingQuestions: IncomingQuestion[] = [];
    if (Array.isArray(sections) && sections.length > 0) {
      for (const s of sections) {
        if (Array.isArray(s.questions)) incomingQuestions.push(...s.questions);
      }
    } else if (Array.isArray(questions)) {
      incomingQuestions = questions;
    }

    if (!Array.isArray(incomingQuestions) || incomingQuestions.length === 0)
      return NextResponse.json({ error: "At least one question is required" }, { status: 400 });

    // Category handling
    if (!categoryId && !categoryName) {
      return NextResponse.json({ error: "categoryId or categoryName is required" }, { status: 400 });
    }

    const trimmedCategoryName = typeof categoryName === "string" ? categoryName.trim() : null;
    let category = null;

    if (categoryId) {
      category = await prisma.questionnaireCategory.findUnique({ where: { id: categoryId } });
      if (!category) {
        return NextResponse.json({ error: "Provided categoryId not found" }, { status: 400 });
      }
    } else if (trimmedCategoryName) {
      category = await prisma.questionnaireCategory.findFirst({ where: { name: trimmedCategoryName } });
      if (!category) {
        category = await prisma.questionnaireCategory.create({ data: { name: trimmedCategoryName } });
      }
    }

    // Process attachments (will use S3 URLs in production, local files in dev)
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
    await walkAndPersist(incomingQuestions);

    // Create template
    const template = await prisma.questionnaireTemplate.create({
      data: {
        name: name.trim(),
        description: description ?? null,
        category: { connect: { id: category!.id } },
      },
    });

    // Recursively create questions
    async function createQuestionsRecursive(qs: IncomingQuestion[], parentQuestionId: string | null = null) {
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        const payload = toQuestionCreatePayload(q, i);

        const questionData: any = {
          text: payload.text,
          description: payload.description,
          type: payload.type,
          required: payload.required,
          order: payload.order,
          options: payload.options,
          attachments: payload.attachments || [],
          validation: payload.validation ?? null,
          template: { connect: { id: template.id } },
        };

        if (parentQuestionId) {
          questionData.parentQuestion = { connect: { id: parentQuestionId } };
        }

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

    await createQuestionsRecursive(incomingQuestions);

    // Return created template
    const created = await prisma.questionnaireTemplate.findUnique({
      where: { id: template.id },
      include: {
        category: true,
        ...QUESTION_NESTED_INCLUDE,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Create template error:", err?.message ?? err, err);
    return NextResponse.json({ error: "Internal server error", details: err?.message }, { status: 500 });
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