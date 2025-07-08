import prisma from "@/app/prisma";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
  const { id } = params;

  await prisma.address.delete({
    where: { id },
  });

  return NextResponse.json({ message: "Address deleted successfully" });
}


export async function GET(request, { params }) {
  const { id } = params;

  try {
    const address = await prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    return NextResponse.json({
      line1: address.street,
      city: address.city,
      state: address.state,
      zip: address.zipCode,
      country: address.country,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching address:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}