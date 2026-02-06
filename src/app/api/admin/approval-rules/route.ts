// app/api/admin/approval-rules/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET(req: NextRequest) {
  try {
    // const rules = await prisma.approvalRule.findMany({
    //   orderBy: { createdAt: "desc" },
    //   include: {
    //     approvers: { orderBy: { order: "asc" } },
    //   },
    // });
    return NextResponse.json([]);
  } catch (err) {
    console.error("GET /api/admin/approval-rules error", err);
    return NextResponse.json({ error: "Failed to fetch approval rules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Basic validation
    if (!body?.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { name, description, criteria, slaHours, escalationEmail, autoPublish = false, active = true, approvers = [] } = body;

    // const created = await prisma.approvalRule.create({
    //   data: {
    //     name,
    //     description,
    //     criteria: criteria ?? null,
    //     slaHours: slaHours ?? null,
    //     escalationEmail: escalationEmail ?? null,
    //     autoPublish: !!autoPublish,
    //     active: !!active,
    //     approvers: {
    //       create: (approvers || []).map((a: any, idx: number) => ({
    //         approverId: a.approverId ?? null,
    //         role: a.role ?? null,
    //         email: a.email ?? null,
    //         order: typeof a.order === "number" ? a.order : idx + 1,
    //         isParallel: !!a.isParallel,
    //       })),
    //     },
    //   },
    //   include: { approvers: true },
    // });

    return NextResponse.json({}, { status: 201 });

    // return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/approval-rules error", err);
    return NextResponse.json({ error: "Failed to create approval rule" }, { status: 500 });
  }
}
