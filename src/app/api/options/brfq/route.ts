// app/api/options/brfq/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/app/prisma'; // Make sure your prisma client is correctly imported

export async function GET() {
  try {
    const [currencies, customerCategories, shippingTypes, urgencies, uoms, suppliers, address, payment, serviceType, carrier, incoterms, users, procurementLeads] = await Promise.all([
      prisma.currency.findMany(),
      prisma.productCategory.findMany(),
      prisma.shipping.findMany(),
      prisma.urgency.findMany(),
      prisma.uom.findMany(),
      prisma.supplier.findMany({
        where: { status: 'Active' },
        include: { productCategories: { include: { productCategory: true } } }
      }),
      prisma.address.findMany(),
      prisma.payment.findMany(),
      prisma.serviceType.findMany(),
      prisma.carrier.findMany(),
      prisma.incoterms.findMany(),
      prisma.user.findMany({ select: { id: true, username: true, email: true } }),
      prisma.procurementLead.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
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
      serviceType,
      carrier,
      incoterms,
      users: users.map(u => ({ id: u.id, name: u.username || u.email })),
      procurementLeads: procurementLeads.map(l => ({ id: l.id, name: l.name })),
    });
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 });
  }
}
