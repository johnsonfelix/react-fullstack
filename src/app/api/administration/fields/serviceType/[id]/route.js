import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
  const { id } = params;

  await prisma.serviceType.delete({
    where: { id },
  });

  return NextResponse.json({ message: "serviceType deleted successfully" });
}
