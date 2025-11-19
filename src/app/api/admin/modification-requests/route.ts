// app/api/admin/modification-requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

/**
 * GET /api/admin/modification-requests
 * Query params:
 *  - page (number, default 1)
 *  - limit (number, default 25)
 *  - status (optional) - filter by modification status (pending/approved/rejected)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || "25")));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get("status") || undefined;
    const q = url.searchParams.get("q") || undefined;

    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { note: { contains: q, mode: "insensitive" } },
        { summary: { path: ["items"], stringify: true }, } // optional, keep for full-text-ish
      ];
    }

    const [total, items] = await Promise.all([
      prisma.modificationRequest.count({ where }),
      prisma.modificationRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          brfq: {
            select: {
              id: true,
              rfqId: true,
              title: true,
              status: true,
              published: true,
              approvalStatus: true,
            },
          },
          // your schema uses `approvals` field on ModificationRequest
          approvals: {
            orderBy: { actedAt: "asc" },
            select: { id: true, action: true, actedBy: true, actedAt: true, note: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
      data: items,
    });
  } catch (err: any) {
    console.error("GET /api/admin/modification-requests error:", err);
    const message = process.env.NODE_ENV === "development" ? err?.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
