// app/api/brfq/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/prisma';

// GET: Fetch a single RFQ with its items
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    
    const brfq = await prisma.bRFQ.findUnique({
    where: { id },
    include: {
      items: true, // include request items
      quotes: {
        include: {
          items: true, // include quote items
        },
      },
    },
  });

    if (!brfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    return NextResponse.json(brfq);
  } catch (error) {
    console.error('Error fetching RFQ:', error);
    return NextResponse.json({ error: 'Failed to fetch RFQ' }, { status: 500 });
  }
}

// DELETE: Delete a specific RFQ by ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const deletedBrfq = await prisma.bRFQ.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'RFQ deleted successfully', brfq: deletedBrfq });
  } catch (error) {
    console.error('Error deleting RFQ:', error);
    return NextResponse.json({ error: 'Failed to delete RFQ' }, { status: 500 });
  }
}
