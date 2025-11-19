// app/api/brfq/[id]/resume/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

/**
 * Resume a paused BRFQ.
 *
 * Body:
 * { performedBy?: string, notifySuppliers?: boolean, notifyInternal?: boolean }
 *
 * Uses `context: any` to avoid Next.js RouteContext ParamCheck typing mismatch.
 */
export async function POST(req: NextRequest, context: any) {
  const brfqId = context?.params?.id ?? null;
  const body = await req.json().catch(() => ({}));
  const performedBy = body.performedBy ?? "unknown_user";
  const notifySuppliers = typeof body.notifySuppliers === "boolean" ? body.notifySuppliers : true;
  const notifyInternal = typeof body.notifyInternal === "boolean" ? body.notifyInternal : true;

  // Helper to coerce JsonArray/JsonValue into string[]
  function normalizeToStringArray(input: any): string[] {
    if (!Array.isArray(input)) return [];
    return input
      .map((it) => {
        if (it == null) return "";
        if (typeof it === "string") return it;
        if (typeof it === "number" || typeof it === "boolean") return String(it);
        if (typeof it === "object") {
          if (typeof it.email === "string" && it.email) return it.email;
          if (typeof it.registrationEmail === "string" && it.registrationEmail) return it.registrationEmail;
          if (typeof it.id === "string" && it.id) return it.id;
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

  try {
    if (!brfqId) {
      return NextResponse.json({ success: false, error: "Missing brfq id" }, { status: 400 });
    }

    const brfq = await prisma.bRFQ.findUnique({ where: { id: brfqId } });
    if (!brfq) return NextResponse.json({ success: false, error: "BRFQ not found" }, { status: 404 });

    // determine new status
    let newStatus = "draft";
    if (brfq.published) newStatus = "published";
    else if (brfq.approvalStatus === "approved") newStatus = "approved";
    else if (brfq.status && brfq.status !== "paused") newStatus = brfq.status;

    // transaction: update brfq and create pauseAction
    await prisma.$transaction([
      prisma.bRFQ.update({
        where: { id: brfqId },
        data: { status: newStatus },
      }),
      prisma.pauseAction.create({
        data: {
          brfqId,
          action: "resumed",
          performedBy,
          notifySuppliers,
        },
      }),
    ]);

    // resolve supplier identifiers safely from JsonArray -> string[]
    const rawSupplierSelected = brfq.suppliersSelected ?? [];
    const supplierIdentifiers = normalizeToStringArray(rawSupplierSelected);

    // direct emails vs ids
    const directEmails = supplierIdentifiers.filter((s) => typeof s === "string" && s.includes("@"));
    const supplierIds = supplierIdentifiers.filter((s) => typeof s === "string" && !s.includes("@"));
    const resolved = new Set<string>(directEmails);

    if (supplierIds.length > 0) {
      const rows = await prisma.supplier.findMany({
        where: { id: { in: supplierIds } },
        select: { registrationEmail: true },
      });
      rows.forEach((r) => r.registrationEmail && resolved.add(r.registrationEmail));
    }

    if (notifySuppliers && resolved.size > 0) {
      const subj = `RFQ ${brfq.rfqId} resumed`;
      const bodyMsg = `The RFQ "${brfq.title}" has been resumed by ${performedBy}. Please continue with bidding as applicable.`;
      await Promise.all(Array.from(resolved).map((email) => sendNotification(email, subj, bodyMsg)));
    }

    // internal notifications
    const cfg = await prisma.adminPauseConfig.findFirst();
    if (notifyInternal && Array.isArray(cfg?.notifyInternalEmails) && cfg!.notifyInternalEmails.length) {
      const subj = `RFQ ${brfq.rfqId} resumed`;
      const bodyMsg = `${performedBy} resumed RFQ ${brfq.rfqId}.`;
      await Promise.all(cfg!.notifyInternalEmails.map((email: string) => sendNotification(email, subj, bodyMsg)));
    }

    return NextResponse.json({ success: true, message: "RFQ resumed", data: { brfqId, status: newStatus } }, { status: 200 });
  } catch (e: any) {
    console.error("resume error", e);
    return NextResponse.json({ success: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}

async function sendNotification(email: string, subject: string, body: string) {
  try {
    console.log(`[NOTIFY] to=${email} subject=${subject}`);
    return true;
  } catch (err) {
    console.error("notify fail", err);
    return false;
  }
}
