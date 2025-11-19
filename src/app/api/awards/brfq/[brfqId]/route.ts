// app/api/awards/brfq/[brfqId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export const dynamic = "force-dynamic";

/**
 * Use `context: any` to avoid Next.js RouteContext / ParamCheck typing mismatch
 * during build. Runtime still receives { params } from Next.js.
 */
export async function GET(req: Request, context: any) {
  try {
    const brfqId = context?.params?.brfqId ?? null;
    if (!brfqId) {
      return NextResponse.json({ success: false, error: "Missing brfqId param" }, { status: 400 });
    }

    const awards = await prisma.award.findMany({
      where: { brfqId },
      include: { winners: true, approvals: true },
    });

    return NextResponse.json({ success: true, data: awards }, { status: 200 });
  } catch (err: any) {
    console.error("GET /awards/brfq/[brfqId] error", err);
    return NextResponse.json({ success: false, error: err?.message ?? "Server error" }, { status: 500 });
  }
}
