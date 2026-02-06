// app/api/admin/modification-requests/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

/**
 * Approve a modification request and apply modifications to the BRFQ.
 * Body (JSON): { actedBy?: string, note?: string, notifySuppliers?: boolean }
 *
 * NOTE: use `context: any` to avoid strict Next.js RouteContext typing issues
 * during build while keeping runtime behavior intact.
 */
export async function POST(req: NextRequest, context: any) {
  const id = context?.params?.id ?? null;
  const body = await req.json().catch(() => ({}));
  const actedBy = body.actedBy ?? "admin";
  const note = body.note ?? "";
  const notifySuppliers = typeof body.notifySuppliers === "boolean" ? body.notifySuppliers : true;

  // helper to coerce various JsonValue/JsonArray shapes to string[]
  function normalizeToStringArray(input: any): string[] {
    if (!Array.isArray(input)) return [];
    return input
      .map((it) => {
        if (it == null) return "";
        if (typeof it === "string") return it;
        if (typeof it === "number" || typeof it === "boolean") return String(it);
        if (typeof it === "object") {
          // if it's an object that contains likely email/id fields, prefer those
          if (typeof it.email === "string" && it.email) return it.email;
          if (typeof it.registrationEmail === "string" && it.registrationEmail) return it.registrationEmail;
          if (typeof it.id === "string" && it.id) return it.id;
          // fallback to JSON-stringified representation (rare)
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
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing modification request id" }, { status: 400 });
    }

    // load modification request with brfq
    const mod = await prisma.modificationRequest.findUnique({
      where: { id },
      include: { brfq: true }, // include minimal brfq
    });

    if (!mod) {
      return NextResponse.json({ success: false, error: "Modification request not found" }, { status: 404 });
    }
    if (mod.status !== "pending") {
      return NextResponse.json({ success: false, error: "Modification request not pending" }, { status: 400 });
    }

    const brfqId = mod.rfqId;
    const summary = ((mod as any).summary ?? {}) as any;

    // Build BRFQ update payload
    const brfqUpdate: any = {};

    // Example mapping: if summary contains closeDateTime -> update BRFQ.closeDate & closeTime
    if (summary.closeDateTime && summary.closeDateTime.to) {
      const dt = new Date(summary.closeDateTime.to);
      if (!isNaN(dt.getTime())) {
        brfqUpdate.closeDate = dt;
        brfqUpdate.closeTime = dt;
      }
    }

    // If publishOnApproval present in summary
    if (summary.publishOnApproval && typeof summary.publishOnApproval.to !== "undefined") {
      brfqUpdate.publishOnApproval = !!summary.publishOnApproval.to;
      // when admin approves we can also set published/appr metadata if publishOnApproval true
      if (brfqUpdate.publishOnApproval === true) {
        brfqUpdate.published = true;
        brfqUpdate.approvalStatus = "approved";
        brfqUpdate.approvedAt = new Date();
        brfqUpdate.approvedBy = actedBy;
      }
    }

    // Generic allowed keys to copy from summary.to to brfq
    const allowedKeys = ["title", "currency", "incoterms", "carrier", "notesToSupplier", "targetPrice", "status"];
    for (const k of Object.keys(summary || {})) {
      if (allowedKeys.includes(k) && summary[k]?.to !== undefined) {
        brfqUpdate[k] = summary[k].to;
      }
    }

    // Force brfq.status to 'approved' after applying modifications
    brfqUpdate.status = "approved";
    // Also set a higher-level approval marker
    brfqUpdate.approvalStatus = "approved";
    brfqUpdate.approvedAt = new Date();
    brfqUpdate.approvedBy = actedBy;

    // Items replacement: if summary has items.to array, we'll replace RequestItem rows
    let needItemsReplace = false;
    let newItemsData: any[] = [];
    if (summary.items && Array.isArray(summary.items.to)) {
      needItemsReplace = true;
      newItemsData = (summary.items.to as any[]).map((it) => ({
        internalPartNo: it.internalPartNo ?? null,
        manufacturer: it.manufacturer ?? null,
        mfgPartNo: it.mfgPartNo ?? null,
        description: it.description ?? it.itemDescription ?? "",
        uom: it.uom ?? it.UOM ?? "EA",
        quantity: Number(it.quantity ?? it.qty ?? 0),
        brfqId,
      }));
    }

    // Build ops array for transaction
    const ops: any[] = [];

    // 1) delete existing items if needed
    if (needItemsReplace) {
      ops.push(prisma.requestItem.deleteMany({ where: { brfqId } }));
    }

    // 2) create new items if provided
    if (needItemsReplace && newItemsData.length > 0) {
      // use createMany for speed (doesn't return created rows)
      ops.push(prisma.requestItem.createMany({ data: newItemsData }));
    }

    // 3) update BRFQ with brfqUpdate
    ops.push(prisma.bRFQ.update({ where: { id: brfqId }, data: brfqUpdate }));

    // 4) update modification request status -> approved + metadata
    ops.push(
      prisma.modificationRequest.update({
        where: { id },
        data: {
          status: "approved",
          // processedBy: actedBy,
          // processedAt: new Date(),
        },
      })
    );

    // 5) create approval history record (Commented out: Model does not exist)
    // ops.push(
    //   prisma.modificationApprovalHistory.create({
    //     data: {
    //       modificationId: id,
    //       action: "approve",
    //       actedBy,
    //       actedAt: new Date(),
    //       note,
    //     },
    //   })
    // );

    // run transaction
    const txResults = await prisma.$transaction(ops);

    // find updated BRFQ object inside txResults (it will be an object with rfqId property)
    const updatedBRFQ = txResults.find((r) => r && typeof r === "object" && (r as any).rfqId) ?? null;

    // Notify suppliers (best-effort) if requested
    if (notifySuppliers && updatedBRFQ) {
      // prefer suppliersSelected on the updated BRFQ; fallback to mod.brfq.suppliersSelected
      const rawSupplierSelectedFromUpdated = (updatedBRFQ as any).suppliersSelected ?? null;
      const rawSupplierSelectedFromMod = mod.brfq?.suppliersSelected ?? null;

      // combine preference: updatedBRFQ first, otherwise mod.brfq
      const supplierIdentifiersSource = rawSupplierSelectedFromUpdated ?? rawSupplierSelectedFromMod ?? [];

      // Normalize into string[] safely
      const supplierIdentifiers = normalizeToStringArray(supplierIdentifiersSource);

      // Separate direct emails vs supplier ids
      const directEmails = supplierIdentifiers.filter((s) => s.includes("@"));
      const ids = supplierIdentifiers.filter((s) => !s.includes("@"));

      const resolvedEmails: string[] = [...directEmails];
      if (ids.length > 0) {
        try {
          const supRows = await prisma.supplier.findMany({
            where: { id: { in: ids } },
            select: { registrationEmail: true },
          });
          supRows.forEach((s) => {
            if (s.registrationEmail) resolvedEmails.push(s.registrationEmail);
          });
        } catch (e) {
          console.warn("Failed to resolve supplier emails", e);
        }
      }

      // dedupe
      const notifyList = Array.from(new Set(resolvedEmails)).filter(Boolean);

      // send notifications (best-effort). Replace sendSupplierNotification with your real implementation.
      await Promise.all(notifyList.map((email) => sendSupplierNotification(email, (updatedBRFQ as any).rfqId, (updatedBRFQ as any).title)));
    }

    return NextResponse.json({
      success: true,
      message: "Modification approved and applied. BRFQ status updated to 'approved'.",
      data: { brfq: updatedBRFQ },
    });
  } catch (err: any) {
    console.error("Approve modification error:", err);
    const message = process.env.NODE_ENV === "development" ? err?.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** Placeholder notification function — replace with real mailer/notification integration. */
async function sendSupplierNotification(email: string, rfqId: string, title: string) {
  try {
    // implement integration with your email/service provider here (SendGrid/SES/post to notifications service/etc.)
    console.log(`Notify supplier ${email} — RFQ Updated ${rfqId} "${title}"`);
    // Example placeholder:
    // await fetch(process.env.NOTIFICATION_SERVICE_URL!, { method: "POST", body: JSON.stringify({ to: email, subject: `RFQ Updated – ${rfqId}`, body: `RFQ ${title} updated. Please review.` })});
    return true;
  } catch (e) {
    console.error("sendSupplierNotification error:", e);
    return false;
  }
}
