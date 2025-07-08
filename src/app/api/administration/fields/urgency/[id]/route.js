import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
  const { id } = params;

  await prisma.urgency.delete({
    where: { id },
  });

  return NextResponse.json({ message: "Category deleted successfully" });
}
