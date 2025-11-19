import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
  const { id } = params;

  await prisma.carrier.delete({
    where: { id },
  });

  return NextResponse.json({ message: "carrier deleted successfully" });
}
