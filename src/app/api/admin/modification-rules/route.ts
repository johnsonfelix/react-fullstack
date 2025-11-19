// app/api/admin/modification-rules/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET() {
  try {
    // Return the single rules document if exists - or empty defaults
    const cfg = await prisma.modificationRules.findFirst();
    if (!cfg) {
      return NextResponse.json({
        id: null,
        name: "Default Modification Rules",
        fields: [],
        approvers: [],
        notifyAllSuppliersOnChange: true,
        supplierNotificationSubject: null,
        supplierNotificationBody: null,
      }, { status: 200 });
    }
    return NextResponse.json(cfg, { status: 200 });
  } catch (err) {
    console.error("GET /api/admin/modification-rules error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Basic validation
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const payload: any = {
      name: body.name ?? "Default Modification Rules",
      fields: body.fields ?? [],
      approvers: body.approvers ?? [],
      notifyAllSuppliersOnChange: !!body.notifyAllSuppliersOnAnyChange,
      supplierNotificationSubject: body.supplierNotificationSubject ?? null,
      supplierNotificationBody: body.supplierNotificationBody ?? null,
    };

    // If id provided -> update, else create (if a record exists we update first record)
    if (body.id) {
      const updated = await prisma.modificationRules.update({
        where: { id: body.id },
        data: payload,
      });
      return NextResponse.json(updated, { status: 200 });
    }

    // if no id: attempt to update existing record (single-config flow) else create new
    const existing = await prisma.modificationRules.findFirst();
    if (existing) {
      const updated = await prisma.modificationRules.update({
        where: { id: existing.id },
        data: payload,
      });
      return NextResponse.json(updated, { status: 200 });
    }

    const created = await prisma.modificationRules.create({
      data: payload,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/modification-rules error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
