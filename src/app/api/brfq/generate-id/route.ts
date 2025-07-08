import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // adjust based on your setup
import prisma from '@/app/prisma'; // adjust to your prisma setup

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const emailPrefix = userEmail.slice(0, 3).toUpperCase();
  const random = Math.floor(Math.random() * 900 + 100); // random 3-digit number

  const baseId = `${emailPrefix}`;

  // Find the last RFQ with this base
  const lastRfq = await prisma.bRFQ.findFirst({
    where: {
      rfqId: {
        startsWith: baseId,
      },
    },
    orderBy: {
      rfqId: 'desc',
    },
  });

  let nextIndex = 1;
  if (lastRfq?.rfqId) {
    const match = lastRfq.rfqId.match(/(\d{3})$/);
    if (match) {
      nextIndex = parseInt(match[1]) + 1;
    }
  }

  const paddedIndex = String(nextIndex).padStart(3, '0');
  const generatedId = `${baseId}${paddedIndex}`;

  return NextResponse.json({ rfqId: generatedId });
}
