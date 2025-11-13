// /src/app/api/s3/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const S3_BUCKET = process.env.S3_BUCKET || "inventory-projects-cerchilo";
const S3_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BASE_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/`;

const s3 = new S3Client({ region: S3_REGION });

function normalizeUrlsPayload(body: any): string[] {
  if (!body) return [];
  if (Array.isArray(body)) return body.filter(Boolean).map(String);
  if (typeof body === "object" && Array.isArray(body.urls)) return body.urls.filter(Boolean).map(String);
  if (typeof body === "string") return [body];
  return [];
}

/** Get S3 key from URL if it's from configured bucket. Returns null for local paths or external hosts. */
function s3KeyFromUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return null; // local path
  try {
    const u = new URL(url);
    const origin = `${u.protocol}//${u.host}/`;
    if (origin === S3_BASE_URL) return u.pathname.replace(/^\//, "");
    if (u.host.startsWith(`${S3_BUCKET}.`)) return u.pathname.replace(/^\//, "");
    // fallback: if string contains '/questionnaire/' and the bucket name somewhere, try to extract path
    const idx = url.indexOf("/questionnaire/");
    if (idx !== -1 && url.includes(S3_BUCKET)) {
      return url.slice(idx + 1); // strip leading slash
    }
    return null;
  } catch {
    return null;
  }
}

async function deleteKeys(keys: string[]) {
  if (!keys || keys.length === 0) return { deleted: [], errors: [] };

  const MAX = 1000;
  const allDeleted: any[] = [];
  const allErrors: any[] = [];

  for (let i = 0; i < keys.length; i += MAX) {
    const chunk = keys.slice(i, i + MAX);
    const params = {
      Bucket: S3_BUCKET,
      Delete: { Objects: chunk.map((k) => ({ Key: k })), Quiet: false },
    };
    try {
      const cmd = new DeleteObjectsCommand(params);
      const res = await s3.send(cmd);
      if (res.Deleted) allDeleted.push(...(res.Deleted as any[]));
      if (res.Errors && (res.Errors as any[]).length) allErrors.push(...(res.Errors as any[]));
    } catch (err) {
      // convert to readable error
      allErrors.push({ message: (err as any)?.message ?? String(err), chunk });
    }
  }

  return { deleted: allDeleted, errors: allErrors };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const urls = normalizeUrlsPayload(body.urls ?? body);
    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: "No urls provided" }, { status: 400 });
    }

    const keys = urls.map(s3KeyFromUrl).filter(Boolean) as string[];
    if (keys.length === 0) {
      return NextResponse.json({ message: "No S3 keys matched (nothing to delete)", deleted: [], errors: [] });
    }

    const result = await deleteKeys(keys);
    return NextResponse.json({ message: "Delete attempted", deleted: result.deleted, errors: result.errors }, { status: 200 });
  } catch (err) {
    console.error("S3 delete API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
