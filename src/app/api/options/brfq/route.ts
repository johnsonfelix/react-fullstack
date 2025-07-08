// app/api/options/brfq/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/app/prisma'; // Make sure your prisma client is correctly imported

export async function GET() {
  try {
    const [currencies, customerCategories, shippingTypes, urgencies, uoms, suppliers,address,payment] = await Promise.all([
      prisma.currency.findMany(),
      prisma.category.findMany(),
      prisma.shipping.findMany(),
      prisma.urgency.findMany(),
      prisma.uom.findMany(),
      prisma.supplier.findMany(),
      prisma.address.findMany(),
      prisma.payment.findMany(),
    ]);

    return NextResponse.json({
      currencies,
      customerCategories,
      shippingTypes,
      urgencies,
      uoms,
      suppliers,
      address,
      payment,
    });
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 });
  }
}
