// app/api/admin/approval-rules/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 1];
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    // const rule = await prisma.approvalRule.findUnique({
    //   where: { id },
    //   include: { approvers: { orderBy: { order: "asc" } }, history: { orderBy: { createdAt: "desc" } } },
    // });
    // if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ id });
  } catch (err) {
    console.error("GET /api/admin/approval-rules/[id] error", err);
    return NextResponse.json({ error: "Failed to fetch rule" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 1];
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const body = await req.json();
    const { name, description, criteria, slaHours, escalationEmail, autoPublish, active, approvers } = body;

    // update core rule
    // const updatedRule = await prisma.approvalRule.update({
    //   where: { id },
    //   data: {
    //     name,
    //     description,
    //     criteria: criteria ?? undefined,
    //     slaHours: slaHours ?? undefined,
    //     escalationEmail: escalationEmail ?? undefined,
    //     autoPublish: typeof autoPublish === "boolean" ? autoPublish : undefined,
    //     active: typeof active === "boolean" ? active : undefined,
    //   },
    // });
    // return NextResponse.json({}); // This line was part of the instruction but seems misplaced.
    // The instruction also had "create (safe when list small)" which is a comment.

    // upsert approvers: easiest approach — delete existing and recreate (safe when list small)
    // if (Array.isArray(approvers)) {
    //   await prisma.approvalApprover.deleteMany({ where: { ruleId: id } });
    //   if (approvers.length > 0) {
    //     await prisma.approvalApprover.createMany({
    //       data: approvers.map((a: any, idx: number) => ({
    //         ruleId: id,
    //         approverId: a.approverId ?? null,
    //         role: a.role ?? null,
    //         email: a.email ?? null,
    //         order: typeof a.order === "number" ? a.order : idx + 1,
    //         isParallel: !!a.isParallel,
    //       })),
    //     });
    //   }
    // }

    // const full = await prisma.approvalRule.findUnique({ where: { id }, include: { approvers: { orderBy: { order: "asc" } } } });
    return NextResponse.json({ id: id });
  } catch (err) {
    console.error("PUT /api/admin/approval-rules/[id] error", err);
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/");
  const id = parts[parts.length - 1];
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    // await prisma.approvalRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/approval-rules/[id] error", err);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
