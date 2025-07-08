import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/prisma';
import jwt from 'jsonwebtoken';

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();

    const {
      supplierQuoteNo,
      validFor,
      currency,
      shipping,
      comments,
      token,
      items,
    } = body;

    if (!supplierQuoteNo || !validFor || !currency || !shipping || !token || !items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let decoded: any;
    try {
  decoded = jwt.verify(token, process.env.NEXT_AUTH_SECRET!);
} catch (err) {
  console.error('JWT verification failed:', err);
  return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
}

// Ensure decoded is not null or missing fields
if (!decoded || !decoded.rfqId || !decoded.supplierId) {
  return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
}

const { rfqId, supplierId } = decoded;
console.log('rfqId');
console.log(supplierId);


    const [rfqExists, supplierExists] = await Promise.all([
      prisma.bRFQ.findUnique({ where: { id: rfqId } }),
      prisma.supplier.findUnique({ where: { id: supplierId } }),
    ]);

    if (!rfqExists || !supplierExists) {
      return NextResponse.json({ error: 'Invalid RFQ or Supplier ID' }, { status: 400 });
    }

    const quote = await prisma.quote.create({
      data: {
        supplierQuoteNo,
        validFor,
        currency,
        shipping,
        comments,
        rfqId,
        supplierId,
        items: {
          create: items.map((item: any) => ({
            supplierPartNo: item.supplierPartNo,
            deliveryDays: item.deliveryDays,
            unitPrice: item.unitPrice,
            qty: item.qty,
            uom: item.uom,
            cost: parseFloat(item.cost), // ensure cost is a number
          })),
        },
      },
    });

    return NextResponse.json(
      { message: 'Quote created successfully', quote },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating quote:', error); // better logging
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
