// app/api/admin/pause-reasons/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function GET() {
  try {
    // const reasons = await prisma.pauseReason.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: [] });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ success: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, label, active = true } = body;
    // if (!key || !label) return NextResponse.json({ success: false, error: "Missing key/label" }, { status: 400 });
    // const created = await prisma.pauseReason.create({ data: { key, label, active } });
    return NextResponse.json({ success: true, data: {} }, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ success: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
