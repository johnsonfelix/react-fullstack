// app/api/suppliers/by-category/[name]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");
    const name = decodeURIComponent(pathnameParts.at(-1) ?? "");

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        group: {
          some: {
            name: name,
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
