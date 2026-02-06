// app/api/admin/pause-reasons/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

/**
 * Use `context: any` to avoid strict Next.js RouteContext/ParamCheck typing mismatches
 * at build time while preserving runtime behavior (context.params.id).
 */

export async function PUT(req: NextRequest, context: any) {
  const id = context?.params?.id ?? null;
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id param" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { label, active } = body;

    // const updated = await prisma.pauseReason.update({
    //   where: { id },
    //   data: { label, active },
    // });
    const updated = { id, label, active };

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (e: any) {
    console.error("Update pauseReason error:", e);
    return NextResponse.json({ success: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: any) {
  const id = context?.params?.id ?? null;
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id param" }, { status: 400 });
  }

  try {
    // await prisma.pauseReason.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error("Delete pauseReason error:", e);
    return NextResponse.json({ success: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
