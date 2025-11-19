// app/api/admin/brfqs/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";
import { generateQuoteToken } from "../../lib/jwt";
import { generateRFQEmail } from "../../lib/email-template/rfqTemplate";
import { sendRFQEmails } from "../../lib/mail";
// simple admin guard - replace with your auth logic

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

async function fetchSupplierEmailsByIds(ids: string[]): Promise<Record<string, string | null>> {
  if (!Array.isArray(ids) || ids.length === 0) return {};
  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: ids } },
    select: { id: true, companyName: true, registrationEmail: true },
  });

  const map: Record<string, string | null> = {};
  suppliers.forEach((s) => {
    map[s.id] = s.registrationEmail ?? null;
  });

  // ensure all ids are present in map
  ids.forEach((id) => {
    if (!(id in map)) map[id] = null;
  });

  return map;
}

/** Normalize JsonArray/JsonValue (Prisma) into a safe string[] */
function normalizeToStringArray(input: any): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((it) => {
      if (it == null) return "";
      if (typeof it === "string") return it.trim();
      if (typeof it === "number" || typeof it === "boolean") return String(it);
      if (typeof it === "object") {
        // if object contains common fields, prefer those
        if (typeof (it as any).id === "string" && (it as any).id) return (it as any).id;
        if (typeof (it as any).email === "string" && (it as any).email) return (it as any).email;
        if (typeof (it as any).registrationEmail === "string" && (it as any).registrationEmail) return (it as any).registrationEmail;
        try {
          return JSON.stringify(it);
        } catch {
          return String(it);
        }
      }
      return String(it);
    })
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // expect something like /api/admin/brfqs/{id}/{action}
    const last = parts[parts.length - 1];
    const action = last === "approve" || last === "reject" ? last : null;
    const id = action ? parts[parts.length - 2] : parts[parts.length - 1];

    if (!id) {
      return NextResponse.json({ error: "Missing BRFQ id in path" }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ error: "Missing action (approve|reject) in path" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const note: string | undefined = body.note;
    // optional publish override boolean or null
    const publishOverride: boolean | null = typeof body.publishOverride === "boolean" ? body.publishOverride : null;
    // optionally approvedBy (admin username/email) passed from client; fallback to "admin"
    const approvedBy = typeof body.approvedBy === "string" ? body.approvedBy : "admin";

    // load BRFQ with suppliersSelected + items + any fields needed for email
    const brfq = await prisma.bRFQ.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!brfq) {
      return NextResponse.json({ error: "BRFQ not found" }, { status: 404 });
    }

    if (action === "reject") {
      await prisma.bRFQ.update({
        where: { id },
        data: {
          approvalStatus: "rejected",
          approvalNote: note ?? null,
          approvedBy,
          approvedAt: new Date(),
          published: false,
        },
      });

      return NextResponse.json({ success: true, message: "BRFQ rejected" }, { status: 200 });
    }

    // ACTION === approve
    // determine whether to publish
    let willPublish = brfq.publishOnApproval === true;
    if (publishOverride === true) willPublish = true;
    if (publishOverride === false) willPublish = false;

    // update DB first
    const updated = await prisma.bRFQ.update({
      where: { id },
      data: {
        approvalStatus: "approved",
        approvalNote: note ?? null,
        approvedBy,
        approvedAt: new Date(),
        published: willPublish,
      },
    });

    // gather supplier ids from brfq.suppliersSelected (this field may be JsonArray)
    const supplierIds: string[] = normalizeToStringArray(updated.suppliersSelected);

    // Try to build supplierId -> email map
    const supplierEmailMap = await fetchSupplierEmailsByIds(supplierIds);

    // Compose and send emails
    const base = getBaseUrl();
    const results: Array<{ supplierId: string; email: string | null; sent: boolean; error?: string }> = [];

    for (const sid of supplierIds) {
      // if supplier email not found, skip
      const email = supplierEmailMap[sid] ?? null;
      if (!email) {
        results.push({ supplierId: sid, email: null, sent: false, error: "No email found for supplier id" });
        continue;
      }

      try {
        const token = generateQuoteToken({
          rfqId: updated.id,
          supplierId: sid,
        });

        const link = `${base}/supplier/submit-quote?token=${token}`;
        const register = `${base}/sign-up`;

        const message = generateRFQEmail({
          title: updated.title,
          closeDate: updated.closeDate ? new Date(updated.closeDate).toISOString() : null,
          closeTime: updated.closeTime ? new Date(updated.closeTime).toISOString() : null,
          noteToSupplier: updated.notesToSupplier ?? "",
          quoteLink: link,
          register,
        });

        await sendRFQEmails([email], `New RFQ published: ${updated.title}`, message);

        results.push({ supplierId: sid, email, sent: true });
      } catch (err: any) {
        console.error("Failed sending email to supplier", sid, err);
        results.push({ supplierId: sid, email: supplierEmailMap[sid], sent: false, error: err?.message ?? String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      message: "BRFQ approved" + (willPublish ? " and published" : ""),
      brfq: updated,
      emailResults: results,
    });
  } catch (err: any) {
    console.error("Error in admin approve route:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const approval = searchParams.get("approval"); // e.g. "pending"
  const take = Number(searchParams.get("take") || 50);

  try {
    const where: any = {};
    if (approval === "pending") where.status = "approval_pending";
    // if (approval === "approved") where.approvalStatus = "approved";
    // add other filters as needed

    const brfqs = await prisma.bRFQ.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: { items: true }, // include other relations if needed
    });

    return NextResponse.json({ data: brfqs });
  } catch (err: any) {
    console.error("Admin list error", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
