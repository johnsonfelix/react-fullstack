// app/api/admin/brfqs/[id]/reject/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

/**
 * Use a looser `context: any` type to avoid Next.js ParamCheck/RouteContext
 * compile-time mismatch during build. Runtime `context.params.id` will still
 * be available from Next.js when this route is invoked.
 */
export async function POST(req: NextRequest, context: any) {
  const id = context?.params?.id ?? null;

  const body = await req.json().catch(() => ({}));
  const { note, approver } = body;

  try {
    if (!id) {
      return NextResponse.json({ error: "Missing id param" }, { status: 400 });
    }

    const brfq = await prisma.bRFQ.findUnique({ where: { id } });
    if (!brfq) return NextResponse.json({ error: "BRFQ not found" }, { status: 404 });

    if (brfq.approvalStatus !== "pending") {
      return NextResponse.json({ error: `Cannot reject BRFQ with status ${brfq.approvalStatus}` }, { status: 400 });
    }

    const updated = await prisma.bRFQ.update({
      where: { id },
      data: {
        status: "rejected",
        approvedBy: approver || "admin",
        approvedAt: new Date(),
        approvalNote: note || null,
        published: false,
        approvalStatus: "rejected",
      },
    });

    // TODO: notify the requester with rejection reason (email / in-app notification)

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err: any) {
    console.error("Reject error", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
