import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/prisma';
import { addressSchema } from '@/lib/validations/supplier';
import { ZodError } from 'zod';

/** Find supplierId from a path like /api/suppliers/:supplierId/... */
function extractSupplierIdFromRequest(req: NextRequest): string | null {
  try {
    const segments = new URL(req.url).pathname.split('/').filter(Boolean);
    const idx = segments.indexOf('suppliers');
    if (idx >= 0 && idx + 1 < segments.length) return segments[idx + 1];
    // fallback: if the path strongly resembles /api/:supplierId, return last segment
    if (segments.length > 0) return segments[segments.length - 1];
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supplierId = extractSupplierIdFromRequest(request);
  if (!supplierId) return NextResponse.json({ error: 'Missing supplierId in URL' }, { status: 400 });

  try {
    const body = await request.json();
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const addressesArray = Array.isArray(body) ? body : [body];

    // Validate each address with zod
    const validatedAddresses = addressesArray.map((address) => addressSchema.parse(address));

    // create addresses in a transaction
    const createdAddresses = await prisma.$transaction(
      validatedAddresses.map((address) =>
        prisma.address.create({
          data: {
            type: address.type,
            line1: address.line1,
            line2: address.line2 || null,
            line3: (address as any).line3 || null,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
            usage: (address as any).usage ?? null,
            associatedContacts: (address as any).associatedContacts ?? null,
            supplierId: supplierId,
          },
        })
      )
    );

    return NextResponse.json(createdAddresses, { status: 201 });
  } catch (error: any) {
    console.error('Failed to add addresses:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add addresses' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supplierId = extractSupplierIdFromRequest(request);
  if (!supplierId) return NextResponse.json({ error: 'Missing supplierId in URL' }, { status: 400 });

  try {
    const addresses = await prisma.address.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(addresses, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch addresses:', error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supplierId = extractSupplierIdFromRequest(request);
  if (!supplierId) return NextResponse.json({ error: 'Missing supplierId in URL' }, { status: 400 });

  try {
    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('addressId');

    if (!addressId) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
    }

    // optional: verify address belongs to supplier before deleting
    const addr = await prisma.address.findUnique({ where: { id: addressId } });
    if (!addr) return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    if (addr.supplierId !== supplierId) {
      return NextResponse.json({ error: 'Address does not belong to supplier' }, { status: 403 });
    }

    await prisma.address.delete({ where: { id: addressId } });
    // 204 No Content is standard for deletion
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete address:', error);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
