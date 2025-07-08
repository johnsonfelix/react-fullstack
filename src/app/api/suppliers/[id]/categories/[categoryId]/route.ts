import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function DELETE(req: Request, context: { params: { id: string; categoryId: string } }) {
  const { id, categoryId } = context.params;

  await prisma.supplier.update({
    where: { id },
    data: {
      group: {
        disconnect: { id: categoryId },
      },
    },
  });

  return NextResponse.json({ success: true });
}