// app/api/brfq/[id]/pause/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

/**
 * Body:
 * { requestedBy?: string, reasonId?: string, reasonText?: string, notifyInternal?: boolean, notifySuppliers?: boolean }
 *
 * Note: use `context: any` to avoid Next.js RouteContext ParamCheck typing mismatch.
 */
export async function POST(req: NextRequest, context: any) {
  const brfqId = context?.params?.id ?? null;
  const body = await req.json().catch(() => ({}));
  const requestedBy = body.requestedBy ?? "unknown_user";
  const reasonId = body.reasonId ?? null;
  const reasonText = body.reasonText ?? null;
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

    // check brfq exists
    const brfq = await prisma.bRFQ.findUnique({ where: { id: brfqId } });
    if (!brfq) return NextResponse.json({ success: false, error: "BRFQ not found" }, { status: 404 });

    // read admin config - if not exists assume approval not required
    // const cfg = await prisma.adminPauseConfig.findFirst();
    const cfg: any = null;
    const approvalRequired = cfg?.approvalRequired ?? false;

    if (approvalRequired) {
      // create a PauseRequest that needs admin approval
      const pr = await prisma.pauseRequest.create({
        data: {
          brfqId,
          requestedBy,
          reason: reasonText || String(reasonId) || "Pause requested",
          // reasonId,
          // reasonText,
          status: "pending",
        },
      });

      // log the request action (history)
      await prisma.pauseAction.create({
        data: {
          brfqId,
          action: "pause_requested",
          performedBy: requestedBy,
          // reasonId,
          // reasonText,
          // notifySuppliers,
        },
      });

      // optionally notify internal recipients
      if (notifyInternal && Array.isArray(cfg?.notifyInternalEmails) && cfg.notifyInternalEmails.length) {
        await Promise.all(cfg.notifyInternalEmails.map((email: string) => sendNotification(email, `Pause requested for RFQ ${brfq.rfqId}`, `User ${requestedBy} requested pause: ${reasonText ?? reasonId}`)));
      }

      return NextResponse.json({ success: true, data: pr, message: "Pause request created (awaiting approval)" }, { status: 201 });
    }

    // approval NOT required => apply pause immediately in a transaction
    const txRes = await prisma.$transaction([
      prisma.bRFQ.update({
        where: { id: brfqId },
        data: { status: "paused" },
      }),
      prisma.pauseAction.create({
        data: {
          brfqId,
          action: "paused",
          performedBy: requestedBy,
          // reasonId,
          // reasonText,
          // notifySuppliers,
        },
      }),
    ]);

    // resolve supplier emails from brfq.suppliersSelected (JsonArray -> string[])
    const rawSupplierSelected = brfq.suppliersSelected ?? [];
    const supplierIdentifiers = normalizeToStringArray(rawSupplierSelected);

    // direct emails vs ids
    const directEmails = supplierIdentifiers.filter((s) => typeof s === "string" && s.includes("@"));
    const supplierIds = supplierIdentifiers.filter((s) => typeof s === "string" && !s.includes("@"));
    const resolved = new Set<string>(directEmails);

    if (supplierIds.length > 0) {
      const rows = await prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { registrationEmail: true } });
      rows.forEach((r) => r.registrationEmail && resolved.add(r.registrationEmail));
    }

    if (notifySuppliers && resolved.size > 0) {
      const subj = `RFQ ${brfq.rfqId} paused`;
      const bodyMsg = `The RFQ "${brfq.title}" has been paused by ${requestedBy}. Reason: ${reasonText ?? reasonId ?? "Not specified"}.`;
      await Promise.all(Array.from(resolved).map((email) => sendNotification(email, subj, bodyMsg)));
    }

    // also notify internal recipients if configured
    if (notifyInternal && Array.isArray(cfg?.notifyInternalEmails) && cfg.notifyInternalEmails.length) {
      const subj = `RFQ ${brfq.rfqId} paused (immediate)`;
      const bodyMsg = `${requestedBy} paused RFQ ${brfq.rfqId}. Reason: ${reasonText ?? reasonId ?? "Not specified"}.`;
      await Promise.all(cfg.notifyInternalEmails.map((email: string) => sendNotification(email, subj, bodyMsg)));
    }

    return NextResponse.json({ success: true, message: "RFQ paused", data: { brfqId } });
  } catch (e: any) {
    console.error("pause error", e);
    return NextResponse.json({ success: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/** Replace with your real mailer/notification integration */
async function sendNotification(email: string, subject: string, body: string) {
  try {
    // TODO: integrate SendGrid / SES / internal notifications
    console.log(`[NOTIFY] to=${email} subject=${subject}`);
    return true;
  } catch (err) {
    console.error("notify fail", err);
    return false;
  }
}
