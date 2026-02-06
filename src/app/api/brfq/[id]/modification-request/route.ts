// app/api/brfq/[id]/modification-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

/**
 * Create a modification request for a BRFQ.
 * Body (JSON): { requestedBy?: string, requestedFields?: any[], summary?: any, note?: string }
 *
 * Uses `context: any` to avoid strict Next.js RouteContext typing mismatches.
 */
export async function POST(req: NextRequest, context: any) {
  const id = context?.params?.id ?? null;
  const body = await req.json().catch(() => ({}));

  const requestedBy = body.requestedBy ?? "unknown";
  const rawRequestedFields = body.requestedFields ?? [];
  const summary = body.summary ?? {};
  const note = body.note ?? "";

  // Helper: coerce a variety of JsonArray / JsonValue shapes into a safe array
  function normalizeToArray(input: any): any[] {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    // single value -> wrap
    return [input];
  }

  const requestedFields = normalizeToArray(rawRequestedFields);

  try {
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing brfq id" }, { status: 400 });
    }

    const brfq = await prisma.bRFQ.findUnique({ where: { id } });
    if (!brfq) {
      return NextResponse.json({ success: false, error: "BRFQ not found" }, { status: 404 });
    }

    // create modification request
    const mr = await prisma.modificationRequest.create({
      data: {
        rfqId: String(id),
        supplierId: requestedBy || "unknown",
        // requestedBy,
        // requestedFields,
        // summary,
        reason: note || "Modification requested",
        field: (requestedFields[0] as string) || "general",
        status: "pending",
        // createdAt: new Date(),
      },
    });

    // Pause the RFQ: mark published false and status to 'modifying' (so suppliers can't bid further)
    await prisma.bRFQ.update({
      where: { id },
      data: {
        published: false,
        status: "modifying",
        approvalStatus: "modification_pending",
      },
    });

    return NextResponse.json({ success: true, data: mr }, { status: 201 });
  } catch (err: any) {
    console.error("create modification error", err);
    const message = process.env.NODE_ENV === "development" ? err?.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
