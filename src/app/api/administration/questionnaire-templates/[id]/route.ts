// api/questionnaire/[id].ts  (or the file you already had — replace contents with this)
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";
import fs from "fs/promises";
import path from "path";

// AWS SDK v3
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

/* =========================
   Types
   ========================= */
type IncomingAttachment =
  | { filename?: string; url?: string; data?: string; mimeType?: string }
  | string;

type IncomingQuestion = {
  id?: string | null;
  text: string;
  description?: string | null;
  type?: string;
  required?: boolean;
  order?: number;
  options?: any;
  attachments?: IncomingAttachment[] | string[] | null;
  subQuestions?: IncomingQuestion[];

  validation?: {
    showWhen?: { parentOptionEquals?: string };
  } | null;

  helperText?: string | null;
};

/* =========================
   S3 / config
   ========================= */
const S3_BUCKET = process.env.S3_BUCKET || "inventory-projects-cerchilo";
const S3_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BASE_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/`;

// create S3 client once
const s3 = new S3Client({ region: S3_REGION });

/* =========================
   Utils (existing + new)
   ========================= */
function extractIdFromRequest(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;
    return segments[segments.length - 1];
  } catch {
    return null;
  }
}

/** Persist base64 attachments to /public/uploads/questionnaire; pass through URLs. */
async function persistAttachmentsForQuestion(q: IncomingQuestion): Promise<string[]> {
  if (!q.attachments || (Array.isArray(q.attachments) && q.attachments.length === 0)) return [];

  const uploadDir = path.join(process.cwd(), "public", "uploads", "questionnaire");
  await fs.mkdir(uploadDir, { recursive: true });

  // Already string[] (URLs)
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

    // data:<mime>;base64,<blob>
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

/** Build nested tree from flat rows (includes validation/attachments/etc.). */
function buildNestedTree(flat: any[]) {
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
  return roots;
}

/** Normalize input: prefer sections[].questions, fallback to questions[]. */
function extractIncomingQuestions(body: any): IncomingQuestion[] {
  if (Array.isArray(body?.sections) && body.sections.length > 0) {
    return body.sections.flatMap((s: any) => Array.isArray(s.questions) ? s.questions : []);
  }
  if (Array.isArray(body?.questions)) return body.questions;
  return [];
}

/* =========================
   New helpers for S3 deletion
   ========================= */

/** parse attachments field value (stringified JSON or array) into string[] */
function normalizeAttachmentsField(att: any): string[] {
  if (!att) return [];
  if (Array.isArray(att)) return att.filter(Boolean).map(String);
  if (typeof att === "string") {
    try {
      const parsed = JSON.parse(att);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      // if parsing produced a single string (rare), return that
      if (typeof parsed === "string") return [parsed];
    } catch {
      // not JSON, treat as single URL
      return [att];
    }
  }
  return [];
}

/** from an attachment URL, return S3 key (path in bucket) if it belongs to our bucket, otherwise null */
function s3KeyFromUrl(url: string): string | null {
  if (!url) return null;

  // skip local paths
  if (url.startsWith("/")) return null;

  try {
    const u = new URL(url);
    const origin = `${u.protocol}//${u.host}/`;

    // exact match for our bucket-hosted URL
    if (origin === S3_BASE_URL) {
      return u.pathname.replace(/^\//, "");
    }

    // host begins with bucket name: bucket.s3.region.amazonaws.com
    if (u.host.startsWith(`${S3_BUCKET}.`)) {
      return u.pathname.replace(/^\//, "");
    }

    // fallback: if URL contains '/questionnaire/' and mentions bucket name, extract portion after '/questionnaire/'
    const idx = url.indexOf("/questionnaire/");
    if (idx !== -1 && url.includes(S3_BUCKET)) {
      return url.slice(idx + 1);
    }

    // not our bucket (or uses CDN/custom domain) -> ignore by default
    return null;
  } catch {
    return null;
  }
}

/** delete S3 keys in batches (max 1000 per DeleteObjects call) */
async function deleteS3Keys(keys: string[]) {
  if (!keys || keys.length === 0) return;
  const MAX = 1000;
  for (let i = 0; i < keys.length; i += MAX) {
    const chunk = keys.slice(i, i + MAX);
    const params = {
      Bucket: S3_BUCKET,
      Delete: {
        Objects: chunk.map((k) => ({ Key: k })),
        Quiet: false,
      },
    };
    try {
      const cmd = new DeleteObjectsCommand(params);
      const res = await s3.send(cmd);
      if (res.Errors && res.Errors.length) {
        console.warn("S3 DeleteObjects partial errors:", res.Errors);
      }
    } catch (err) {
      // log and continue — you can throw here if you want to fail the entire operation
      console.error("S3 delete error for chunk:", err);
    }
  }
}

/* =========================
   GET (single)
   ========================= */
export async function GET(req: Request) {
  const id = extractIdFromRequest(req);
  if (!id) return NextResponse.json({ error: "Missing template id in URL" }, { status: 400 });

  try {
    const template = await prisma.questionnaireTemplate.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const flat = await prisma.questionnaireQuestion.findMany({
      where: { templateId: id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        text: true,
        description: true,
        type: true,
        required: true,
        order: true,
        options: true,
        attachments: true,
        validation: true,
        parentQuestionId: true,
        templateId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const roots = buildNestedTree(flat);
    const result = { ...template, questions: roots };
    return NextResponse.json(result);
  } catch (err) {
    console.error("Fetch template error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* =========================
   PATCH (edit or toggle)
   ========================= */
export async function PATCH(req: Request) {
  const id = extractIdFromRequest(req);
  if (!id) return NextResponse.json({ error: "Missing template id in URL" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));

    const hasQuestionsPayload =
      Array.isArray(body?.sections) || Array.isArray(body?.questions);

    if (!hasQuestionsPayload && typeof body?.isActive === "boolean") {
      const t = await prisma.questionnaireTemplate.findUnique({ where: { id } });
      if (!t) return NextResponse.json({ error: "Template not found" }, { status: 404 });

      const updated = await prisma.questionnaireTemplate.update({
        where: { id },
        data: { isActive: body.isActive },
      });
      return NextResponse.json(updated);
    }

    const { name, description, isActive } = body as {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    };
    const incomingQuestions = extractIncomingQuestions(body);

    if (!name || !name.trim())
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });

    if (!Array.isArray(incomingQuestions))
      return NextResponse.json({ error: "questions array is required" }, { status: 400 });

    const templateExists = await prisma.questionnaireTemplate.findUnique({ where: { id } });
    if (!templateExists) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    // Persist attachments (base64 -> files) recursively
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
    await walkAndPersist(incomingQuestions);

    // Collect existing question ids
    const existingFlat = await prisma.questionnaireQuestion.findMany({
      where: { templateId: id },
      select: { id: true },
    });
    const existingIds = new Set(existingFlat.map((r) => r.id));
    const keptIds = new Set<string>();

    await prisma.$transaction(async (tx) => {
      async function processLevel(qs: IncomingQuestion[] | undefined, parentQuestionId: string | null) {
        if (!qs || qs.length === 0) return;

        for (let i = 0; i < qs.length; i++) {
          const q = qs[i];

          const order = typeof q.order === "number" ? q.order : i;

          const payload: any = {
            text: q.text,
            description: q.description ?? null,
            type: q.type ?? "text",
            required: !!q.required,
            order,
            options: typeof q.options !== "undefined" ? q.options : null,
            attachments: Array.isArray(q.attachments) ? (q.attachments as string[]) : [],
            validation: q.validation ?? null,
          };

          if (q.id && existingIds.has(q.id)) {
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
            const dataCreate: any = {
              ...payload,
              template: { connect: { id } },
            };
            if (parentQuestionId) dataCreate.parentQuestion = { connect: { id: parentQuestionId } };

            const created = await tx.questionnaireQuestion.create({ data: dataCreate });
            keptIds.add(created.id);
            if (q.subQuestions && q.subQuestions.length) {
              await processLevel(q.subQuestions, created.id);
            }
          }
        }
      }

      await processLevel(incomingQuestions, null);

      // Delete all questions from this template that weren't kept
      await tx.questionnaireQuestion.deleteMany({
        where: { templateId: id, id: { notIn: Array.from(keptIds) } },
      });

      // Update template record
      await tx.questionnaireTemplate.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description ?? null,
          ...(typeof isActive === "boolean" ? { isActive } : {}),
        },
      });
    });

    // Return updated template + nested questions + category
    const template = await prisma.questionnaireTemplate.findUnique({
      where: { id },
      include: { category: true },
    });

    const flat = await prisma.questionnaireQuestion.findMany({
      where: { templateId: id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        text: true,
        description: true,
        type: true,
        required: true,
        order: true,
        options: true,
        attachments: true,
        validation: true,
        parentQuestionId: true,
        templateId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const roots = buildNestedTree(flat);
    return NextResponse.json({ ...template, questions: roots });
  } catch (err) {
    console.error("Update (PATCH) template error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* =========================
   DELETE (with S3 cleanup)
   ========================= */
export async function DELETE(req: Request) {
  const id = extractIdFromRequest(req);
  if (!id) return NextResponse.json({ error: "Missing template id in URL" }, { status: 400 });

  try {
    // fetch template to ensure exists
    const template = await prisma.questionnaireTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    // fetch questions for attachments
    const questions = await prisma.questionnaireQuestion.findMany({
      where: { templateId: id },
      select: { id: true, attachments: true },
    });

    // collect keys
    const keysSet = new Set<string>();
    for (const q of questions) {
      const attachments = normalizeAttachmentsField(q.attachments);
      for (const a of attachments) {
        const key = s3KeyFromUrl(a);
        if (key) keysSet.add(key);
      }
    }

    const keys = Array.from(keysSet);
    if (keys.length) {
      // delete from S3 first (so we still know what to delete)
      await deleteS3Keys(keys);
    }

    // delete template (assumes cascade or DB constraints will remove questions)
    await prisma.questionnaireTemplate.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Delete template error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* =========================
   (Optional) PUT legacy
   ========================= */
export async function PUT(req: Request) {
  return PATCH(req);
}
