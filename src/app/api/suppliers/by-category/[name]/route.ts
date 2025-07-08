// app/api/suppliers/by-category/[name]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/prisma';

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const categoryName = decodeURIComponent(params.name);

  try {
    const suppliers = await prisma.supplier.findMany({
      where: {
        group: {
          some: {
            name: categoryName,
          },
        },
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(suppliers);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error fetching suppliers' }, { status: 500 });
  }
}
