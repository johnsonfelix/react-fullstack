// app/api/admin/brfqs/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";
import { generateQuoteToken } from "@/app/api/lib/jwt";
import { generateRFQEmail } from "@/app/api/lib/email-template/rfqTemplate";
import { sendRFQEmails } from "@/app/api/lib/mail";

// helper to compute base url
const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

/**
 * SupplierSelectedItem is either:
 * - string (supplier id), or
 * - object containing at least optional id / email / registrationEmail / user.email
 */
type SupplierSelectedItem =
  | string
  | {
      id?: string;
      email?: string | null;
      registrationEmail?: string | null;
      user?: { email?: string | null } | null;
      [key: string]: any;
    }
  | null
  | undefined;

/**
 * Convert suppliersSelected stored in BRFQ to array of supplier ids
 * Supports: ['id1','id2'] OR [{ id, email, user: { email } }, { ... }]
 */
function extractSupplierIds(suppliersSelected: any): string[] {
  if (!Array.isArray(suppliersSelected)) return [];
  const out: string[] = [];
  for (const s of suppliersSelected as SupplierSelectedItem[]) {
    if (!s) continue;
    if (typeof s === "string") {
      out.push(s);
    } else if (typeof s === "object" && s.id) {
      out.push(String(s.id));
    }
  }
  return out;
}

/**
 * NOTE: use a looser `context: any` here to avoid Next.js ParamCheck/RouteContext
 * typing mismatch during build. This leaves runtime behavior unchanged while
 * fixing the TypeScript compile error you saw.
 */
export async function POST(req: NextRequest, context: any) {
  // extract id defensively from the context (context may be { params: { id } })
  const id = context?.params?.id ?? null;

  const body = await req.json().catch(() => ({}));
  const { note, publishOverride, approver } = body;

  try {
    if (!id) {
      return NextResponse.json({ error: "Missing id param" }, { status: 400 });
    }

    const brfq = await prisma.bRFQ.findUnique({
      where: { id },
      include: { items: true }, // include items for email template if needed
    });
    if (!brfq) return NextResponse.json({ error: "BRFQ not found" }, { status: 404 });

    // Allow approve when pending or none (adjust per your business rules)
    if (brfq.approvalStatus !== "pending" && brfq.approvalStatus !== "none" && brfq.approvalStatus !== null) {
      return NextResponse.json({ error: `Cannot approve BRFQ with status ${brfq.approvalStatus}` }, { status: 400 });
    }

    const shouldPublish = typeof publishOverride === "boolean" ? publishOverride : !!brfq.publishOnApproval;

    const updates: any = {
      approvalStatus: "approved",
      approvedBy: approver || "admin",
      approvedAt: new Date(),
      approvalNote: note || null,
    };

    if (shouldPublish) {
      updates.published = true;
      updates.status = "approved";
    }

    // update DB first
    const updated = await prisma.bRFQ.update({
      where: { id },
      data: updates,
    });

    // Build supplier id list (supports both object array and string array)
    const supplierIds = extractSupplierIds(updated.suppliersSelected);

    // ----------------------------
    // Build supplierEmailMap:
    // 1) Prefer inline emails from updated.suppliersSelected objects (email / registrationEmail / user.email)
    // 2) For any ids still missing an email, query supplier table registrationEmail
    // ----------------------------
    const supplierEmailMap: Record<string, string | null> = {};

    // 1) collect from inline objects if present
    if (Array.isArray(updated.suppliersSelected)) {
      const arr = updated.suppliersSelected as SupplierSelectedItem[];
      for (const s of arr) {
        if (!s) continue;
        let sid: string | null = null;
        let inlineEmail: string | null = null;

        if (typeof s === "string") {
          sid = s;
        } else if (typeof s === "object") {
          sid = s.id ? String(s.id) : null;
          inlineEmail = (s.email ?? s.registrationEmail ?? s.user?.email) ?? null;
        }

        if (!sid) continue;
        // preserve any existing value if already set (do not overwrite with null)
        supplierEmailMap[sid] = supplierEmailMap[sid] ?? inlineEmail ?? null;
      }
    }

    // ensure all supplierIds exist in map (initialize to null if missing)
    for (const sid of supplierIds) {
      if (!(sid in supplierEmailMap)) supplierEmailMap[sid] = null;
    }

    // 2) lookup missing emails from suppliers table
    const idsToLookup = Object.keys(supplierEmailMap).filter((k) => !supplierEmailMap[k]);
    if (idsToLookup.length > 0) {
      // Type the DB rows we expect
      type SupplierRow = { id: string; registrationEmail?: string | null; companyName?: string | null };

      const supplierRecords: SupplierRow[] = await prisma.supplier.findMany({
        where: { id: { in: idsToLookup } },
        select: { id: true, registrationEmail: true, companyName: true },
      });

      for (const s of supplierRecords) {
        if (!s || !s.id) continue;
        // set only if not already set
        supplierEmailMap[s.id] = supplierEmailMap[s.id] ?? (s.registrationEmail ?? null);
      }
    }

    // Final console log for debugging (shows id -> email or null)
    console.log("Supplier email map:", supplierEmailMap);

    // Send emails to suppliers that have email addresses
    const base = getBaseUrl();
    const results: Array<{ supplierId: string; email: string | null; sent: boolean; error?: string }> = [];

    for (const sid of Object.keys(supplierEmailMap)) {
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

        // Build email HTML/text using your template generator
        const message = generateRFQEmail({
          title: updated.title,
          closeDate: updated.closeDate ? new Date(updated.closeDate).toISOString() : null,
          closeTime: updated.closeTime ? new Date(updated.closeTime).toISOString() : null,
          noteToSupplier: updated.notesToSupplier ?? "",
          quoteLink: link,
          register,
        });

        // sendRFQEmails expects an array of recipients
        await sendRFQEmails([email], `New RFQ published: ${updated.title}`, message);

        results.push({ supplierId: sid, email, sent: true });
      } catch (err: any) {
        console.error("Failed sending email to supplier", sid, err);
        results.push({ supplierId: sid, email: supplierEmailMap[sid], sent: false, error: err?.message ?? String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      message: "BRFQ approved" + (shouldPublish ? " and published" : ""),
      brfq: updated,
      emailResults: results,
    }, { status: 200 });
  } catch (err: any) {
    console.error("Approve error", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
