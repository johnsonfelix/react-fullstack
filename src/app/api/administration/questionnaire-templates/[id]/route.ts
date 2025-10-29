// /app/api/administration/questionnaire-templates/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";
import fs from "fs/promises";
import path from "path";

type IncomingAttachment = { filename?: string; url?: string; data?: string; mimeType?: string } | string;
type IncomingQuestion = {
  id?: string | null;
  text: string;
  description?: string | null;
  type?: string;
  required?: boolean;
  order?: number;
  options?: any;
  attachments?: IncomingAttachment[] | string[];
  subQuestions?: IncomingQuestion[];
};

// --- util: persist attachments (base64 -> files) and return array of string URLs
async function persistAttachmentsForQuestion(q: IncomingQuestion): Promise<string[]> {
  if (!q.attachments || (Array.isArray(q.attachments) && q.attachments.length === 0)) return [];

  const uploadDir = path.join(process.cwd(), "public", "uploads", "questionnaire");
  await fs.mkdir(uploadDir, { recursive: true });

  // if already string[] of urls, return as-is
  if (Array.isArray(q.attachments) && q.attachments.every((a) => typeof a === "string")) {
    return q.attachments as string[];
  }

  const outUrls: string[] = [];
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

    // expect "data:<mime>;base64,<b64>"
    const parts = (att.data || "").split("base64,");
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

// helper to create DB payload for a question (attachments must be string[] per your schema)
function toQuestionCreatePayload(q: IncomingQuestion, idxOrder = 0) {
  return {
    text: q.text,
    description: q.description ?? null,
    type: q.type ?? "text",
    required: !!q.required,
    order: typeof q.order === "number" ? q.order : idxOrder,
    options: typeof q.options !== "undefined" ? q.options : null,
    attachments: Array.isArray(q.attachments) ? (q.attachments as string[]) : [],
  };
}

/**
 * Helper to extract the dynamic `id` path segment from the request URL.
 * We split the pathname and take the last non-empty segment.
 */
function extractIdFromRequest(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;
    return segments[segments.length - 1];
  } catch (e) {
    return null;
  }
}

// --- GET single template (returns nested questions same as your POST-created response)
export async function GET(req: Request) {
  const id = extractIdFromRequest(req);
  if (!id) return NextResponse.json({ error: "Missing template id in URL" }, { status: 400 });

  try {
    const template = await prisma.questionnaireTemplate.findUnique({
      where: { id },
    });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const flat = await prisma.questionnaireQuestion.findMany({
      where: { templateId: id },
      orderBy: { order: "asc" },
    });

    // build nested tree
    const map = new Map<string, any>();
    const roots: any[] = [];
    for (const f of flat) map.set(f.id, { ...f, subQuestions: [] });
    for (const f of flat) {
      const node = map.get(f.id);
      if (f.parentQuestionId) {
        const parent = map.get(f.parentQuestionId);
        if (parent) parent.subQuestions.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    }

    const result = { ...template, questions: roots };
    return NextResponse.json(result);
  } catch (err) {
    console.error("Fetch template error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// --- PUT: update (edit) template with nested questions
export async function PUT(req: Request) {
  const id = extractIdFromRequest(req);
  if (!id) return NextResponse.json({ error: "Missing template id in URL" }, { status: 400 });

  try {
    const body = await req.json();
    const { name, description, isActive, questions } = body as {
      name?: string;
      description?: string | null;
      isActive?: boolean;
      questions?: IncomingQuestion[];
    };

    if (!name || !name.trim()) return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    if (!Array.isArray(questions)) return NextResponse.json({ error: "questions array is required" }, { status: 400 });

    const templateExists = await prisma.questionnaireTemplate.findUnique({ where: { id } });
    if (!templateExists) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    // persist attachments (base64) recursively and replace attachments with string[] URLs
    async function walkAndPersist(qs?: IncomingQuestion[]) {
      if (!qs) return;
      for (const q of qs) {
        if (q.attachments && q.attachments.length) {
          const urls = await persistAttachmentsForQuestion(q);
          q.attachments = urls;
        } else {
          q.attachments = [];
        }
        if (q.subQuestions && q.subQuestions.length) await walkAndPersist(q.subQuestions);
      }
    }
    await walkAndPersist(questions);

    // existing question ids for this template (flat)
    const existingFlat = await prisma.questionnaireQuestion.findMany({
      where: { templateId: id },
      select: { id: true },
    });
    const existingIds = new Set(existingFlat.map((r) => r.id));
    const keptIds = new Set<string>();

    // do everything in a transaction
    await prisma.$transaction(async (tx) => {
      // recursively process questions at one level, connecting parent using relation connect
      async function processLevel(qs: IncomingQuestion[] | undefined, parentQuestionId: string | null) {
        if (!qs || qs.length === 0) return;
        for (let i = 0; i < qs.length; i++) {
          const q = qs[i];
          const order = typeof q.order === "number" ? q.order : i;

          const payload = {
            text: q.text,
            description: q.description ?? null,
            type: q.type ?? "text",
            required: !!q.required,
            order,
            options: typeof q.options !== "undefined" ? q.options : null,
            attachments: Array.isArray(q.attachments) ? (q.attachments as string[]) : [],
          };

          if (q.id && existingIds.has(q.id)) {
            // update existing: do not attempt to set template directly; update fields and parent relation
            const updated = await tx.questionnaireQuestion.update({
              where: { id: q.id },
              data: {
                ...payload,
                ...(parentQuestionId
                  ? { parentQuestion: { connect: { id: parentQuestionId } } }
                  : { parentQuestion: { disconnect: true } }),
              },
            });
            keptIds.add(updated.id);
            if (q.subQuestions && q.subQuestions.length) {
              await processLevel(q.subQuestions, updated.id);
            }
          } else {
            // create new: connect to template and parent if provided
            const createData: any = {
              ...payload,
              template: { connect: { id } },
            };
            if (parentQuestionId) createData.parentQuestion = { connect: { id: parentQuestionId } };

            const created = await tx.questionnaireQuestion.create({ data: createData });
            keptIds.add(created.id);
            if (q.subQuestions && q.subQuestions.length) {
              await processLevel(q.subQuestions, created.id);
            }
          }
        }
      }

      await processLevel(questions, null);

      // delete orphaned questions that belong to this template but weren't kept
      if (keptIds.size > 0) {
        const toKeep = Array.from(keptIds);
        await tx.questionnaireQuestion.deleteMany({
          where: {
            templateId: id,
            AND: [{ id: { notIn: toKeep } }],
          },
        });
      } else {
        await tx.questionnaireQuestion.deleteMany({ where: { templateId: id } });
      }

      // update template record
      await tx.questionnaireTemplate.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description ?? null,
          isActive: typeof isActive === "boolean" ? isActive : templateExists.isActive,
        },
      });
    });

    // fetch and return nested (same shape as GET)
    const template = await prisma.questionnaireTemplate.findUnique({ where: { id } });
    const flat = await prisma.questionnaireQuestion.findMany({
      where: { templateId: id },
      orderBy: { order: "asc" },
    });
    const map = new Map<string, any>();
    const roots: any[] = [];
    for (const f of flat) map.set(f.id, { ...f, subQuestions: [] });
    for (const f of flat) {
      const node = map.get(f.id);
      if (f.parentQuestionId) {
        const parent = map.get(f.parentQuestionId);
        if (parent) parent.subQuestions.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    }

    return NextResponse.json({ ...template, questions: roots });
  } catch (err) {
    console.error("Update template error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// --- DELETE template
export async function DELETE(req: Request) {
  const id = extractIdFromRequest(req);
  if (!id) return NextResponse.json({ error: "Missing template id in URL" }, { status: 400 });

  try {
    const t = await prisma.questionnaireTemplate.findUnique({ where: { id } });
    if (!t) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    await prisma.questionnaireTemplate.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Delete template error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// --- PATCH toggle active
export async function PATCH(req: Request) {
  const id = extractIdFromRequest(req);
  if (!id) return NextResponse.json({ error: "Missing template id in URL" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const template = await prisma.questionnaireTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    const newIsActive = typeof body.isActive === "boolean" ? body.isActive : !template.isActive;
    const updated = await prisma.questionnaireTemplate.update({ where: { id }, data: { isActive: newIsActive } });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Patch template error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
