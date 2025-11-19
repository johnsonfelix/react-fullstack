// app/api/admin/modification-requests/[id]/reject/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

/**
 * Use `context: any` to avoid Next.js RouteContext ParamCheck typing mismatch
 * during build. Runtime still receives { params } from Next.js.
 */
export async function POST(req: NextRequest, context: any) {
  const id = context?.params?.id ?? null;

  const body = await req.json().catch(() => ({}));
  const actedBy = body.actedBy ?? "admin";
  const note = body.note ?? "";

  try {
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing modification request id" }, { status: 400 });
    }

    const mod = await prisma.modificationRequest.findUnique({ where: { id } });
    if (!mod) return NextResponse.json({ success: false, error: "Modification request not found" }, { status: 404 });
    if (mod.status !== "pending") return NextResponse.json({ success: false, error: "Modification request is not pending" }, { status: 400 });

    // Update modification to rejected and log history in a transaction
    const [updatedMod, history] = await prisma.$transaction([
      prisma.modificationRequest.update({
        where: { id },
        data: { status: "rejected", processedBy: actedBy, processedAt: new Date() },
      }),
      prisma.modificationApprovalHistory.create({
        data: { modificationId: id, action: "reject", actedBy, actedAt: new Date(), note },
      }),
    ]);

    // Optionally: resume the BRFQ (if you paused it earlier) - implement endpoint /api/brfq/:id/resume and call it if needed

    return NextResponse.json(
      { success: true, message: "Modification rejected", data: { modification: updatedMod, history } },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Reject modification error:", err);
    const message = process.env.NODE_ENV === "development" ? err?.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
