import { NextResponse } from 'next/server';
import prisma from '@/app/prisma';

export async function POST(req: Request) {
  try {
    const { procurementRequestId, supplierIds } = await req.json();

    if (!procurementRequestId) {
      return NextResponse.json({ error: 'procurementRequestId is required' }, { status: 400 });
    }

    // If supplierIds is empty, disconnect all
    if (!supplierIds || supplierIds.length === 0) {
      await prisma.procurementRequest.update({
        where: { id: procurementRequestId },
        data: {
          suppliers: {
            set: [], // Disconnects all suppliers
          },
        },
      });
      return NextResponse.json({ message: 'All suppliers removed from procurement.' });
    }

    // Otherwise, set the suppliers to the provided list
    await prisma.procurementRequest.update({
      where: { id: procurementRequestId },
      data: {
        suppliers: {
          set: supplierIds.map((id: string) => ({ id })),
        },
      },
    });

    return NextResponse.json({ message: 'Suppliers updated successfully.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
