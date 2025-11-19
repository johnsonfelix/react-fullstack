// app/api/awards/[id]/approve/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export const dynamic = "force-dynamic";

/**
 * Use `context: any` to avoid Next.js RouteContext / ParamCheck typing mismatch
 * during build. Runtime still receives { params } from Next.js.
 */
export async function POST(req: Request, context: any) {
  try {
    const id = context?.params?.id ?? null;
    if (!id) {
      return NextResponse.json({ error: "Missing id param" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const approver = body.approver ?? "system";
    const rawWinners = Array.isArray(body.winners) ? body.winners : [];
    const winners: { supplierId: string; amount?: number | null }[] = rawWinners
      .map((w: any) => {
        if (!w) return null;
        const supplierId =
          typeof w.supplierId === "string" && w.supplierId.trim()
            ? w.supplierId.trim()
            : typeof w.supplier_id === "string" && w.supplier_id.trim()
            ? w.supplier_id.trim()
            : null;
        if (!supplierId) return null;
        const amount =
          typeof w.amount === "number" ? w.amount : typeof w.amount === "string" && w.amount.trim() !== "" ? Number(w.amount) : null;
        return { supplierId, amount };
      })
      .filter(Boolean) as { supplierId: string; amount?: number | null }[];

    const award = await prisma.award.findUnique({ where: { id } });
    if (!award) return NextResponse.json({ message: "Award not found" }, { status: 404 });

    if (award.status === "approved") {
      return NextResponse.json({ message: "Already approved" }, { status: 200 });
    }

    // create winners if provided
    if (winners.length > 0) {
      await Promise.all(
        winners.map((w) =>
          prisma.awardWinner.create({
            data: { awardId: id, supplierId: w.supplierId, amount: w.amount ?? null },
          })
        )
      );
    }

    const now = new Date();
    await prisma.award.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt: now,
        approvedBy: approver,
      },
    });

    // update BRFQ (if award.brfqId exists)
    if (award.brfqId) {
      await prisma.bRFQ.update({
        where: { id: award.brfqId },
        data: { status: "awarded", approvalStatus: "approved", approvedAt: now, approvedBy: approver },
      });
    }

    // log approval
    await prisma.awardApprovalHistory.create({
      data: {
        awardId: id,
        action: "approved",
        byUser: approver,
        note: body.note ?? null,
      },
    });

    return NextResponse.json({ ok: true, message: "Award approved" }, { status: 200 });
  } catch (err: any) {
    console.error("POST /awards/[id]/approve error", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
