import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/prisma';

/** Extract supplierId from a path like /api/suppliers/:supplierId/... */
function extractSupplierIdFromRequest(req: NextRequest): string | null {
  try {
    const segments = new URL(req.url).pathname.split('/').filter(Boolean);
    const idx = segments.indexOf('suppliers');
    if (idx >= 0 && idx + 1 < segments.length) return segments[idx + 1];
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
    const body = await request.json().catch(() => ({}));
    const { categoryIds } = body as { categoryIds?: unknown };

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json({ error: 'categoryIds must be an array' }, { status: 400 });
    }

    // ensure array of strings and remove duplicates
    const ids = Array.from(new Set(categoryIds.map((c: any) => String(c).trim()).filter(Boolean)));
    if (ids.length === 0) {
      // If client sent an empty array, we'll clear existing mappings and return empty list
      await prisma.supplierCategory.deleteMany({ where: { supplierId } });
      return NextResponse.json([], { status: 200 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Use a single transaction: delete existing mappings then create the new ones
    const txOps: any[] = [
      prisma.supplierCategory.deleteMany({ where: { supplierId } }),
      ...ids.map((categoryId) =>
        prisma.supplierCategory.create({
          data: { supplierId, categoryId },
          include: { productCategory: true },
        })
      ),
    ];

    const txResult = await prisma.$transaction(txOps);
    // txResult[0] is deleteMany result; rest are created records
    const createdCategories = txResult.slice(1);

    return NextResponse.json(createdCategories, { status: 201 });
  } catch (err: any) {
    console.error('Failed to add product categories:', err);
    return NextResponse.json({ error: 'Failed to add product categories' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supplierId = extractSupplierIdFromRequest(request);
  if (!supplierId) return NextResponse.json({ error: 'Missing supplierId in URL' }, { status: 400 });

  try {
    const categories = await prisma.supplierCategory.findMany({
      where: { supplierId },
      include: { productCategory: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(categories, { status: 200 });
  } catch (err) {
    console.error('Failed to fetch product categories:', err);
    return NextResponse.json({ error: 'Failed to fetch product categories' }, { status: 500 });
  }
}
