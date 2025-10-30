import { NextRequest, NextResponse } from 'next/server';
import { companyDetailsSchema } from '@/lib/validations/supplier';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = companyDetailsSchema.parse(body);

    const newSupplier = await prisma.supplier.create({
      data: {
        companyName: validatedData.companyName,
        website: validatedData.website || null,
        country: validatedData.country,
        tradeLicenseNumber: validatedData.tradeLicenseNumber || null,
        taxRegistrationNumber: validatedData.taxRegistrationNumber || null,
        organizationType: validatedData.organizationType,
        supplierType: validatedData.supplierType,
        noteToApprover: validatedData.noteToApprover || null,
        profileAttachments: validatedData.profileAttachments || [],
        status: 'pending',
      } as any,
    });

    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create supplier:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}

function safeSerialize(value: any) {
  const seen = new WeakSet();

  function _clean(v: any) {
    if (v === null || v === undefined) return v;
    if (typeof v === 'bigint') return v.toString();
    if (v instanceof Date) return v.toISOString();
    if (typeof v !== 'object') return v;

    if (seen.has(v)) return '[Circular]';
    seen.add(v);

    if (Array.isArray(v)) return v.map(item => _clean(item));

    // Plain object
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      // skip functions; convert undefined -> null for JSON-friendliness
      try {
        out[k] = val === undefined ? null : _clean(val);
      } catch {
        out[k] = String(val);
      }
    }
    return out;
  }

  return _clean(value);
}

export async function GET(request: NextRequest) {
  console.log('GET /api/supplier invoked — NODE_ENV=', process.env.NODE_ENV);

  try {
    // simple probe: if ?probe=true return quickly (helps confirm route hit without DB)
    const { searchParams } = new URL(request.url);
    if (searchParams.get('probe') === 'true') {
      return NextResponse.json({ ok: true, probe: 'hit' }, { status: 200 });
    }

    // small safety limits
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const pageSize = Math.max(1, Math.min(200, Number(searchParams.get('pageSize') ?? 50)));
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const relLimit = Math.max(0, Math.min(100, Number(searchParams.get('relLimit') ?? 20)));

    // Fetch suppliers with relations (limited)
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        contacts: { orderBy: { createdAt: 'desc' }, take: relLimit },
        addresses: { orderBy: { createdAt: 'desc' }, take: relLimit },
        businessDocuments: { orderBy: { createdAt: 'desc' }, take: relLimit },
        bankAccounts: { orderBy: { createdAt: 'desc' }, take: relLimit },
        productCategories: { orderBy: { createdAt: 'desc' }, take: relLimit, include: { productCategory: true } },
        // questionnaireResponse: { orderBy: { createdAt: 'desc' }, take: relLimit },
      },
    });

    const total = await prisma.supplier.count();

    // Safely serialize before returning (guard against BigInt / Date / circulars)
    const safe = safeSerialize({ data: suppliers, meta: { page, pageSize: take, total, relLimit } });
    return NextResponse.json(safe, { status: 200 });
  } catch (err: any) {
    // Log server-side for CloudWatch / Amplify
    console.error('GET /api/supplier failed:', err);

    // Return detailed error info temporarily to help debugging (remove stack later)
    return NextResponse.json(
      {
        error: 'Failed to fetch suppliers',
        message: String(err?.message ?? err),
        stack: typeof err?.stack === 'string' ? err.stack.split('\n').slice(0, 10).join('\n') : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    const validatedData = companyDetailsSchema.parse(updateData);

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: {
        companyName: validatedData.companyName,
        website: validatedData.website || null,
        country: validatedData.country,
        tradeLicenseNumber: validatedData.tradeLicenseNumber || null,
        taxRegistrationNumber: validatedData.taxRegistrationNumber || null,
        organizationType: validatedData.organizationType,
        supplierType: validatedData.supplierType,
        noteToApprover: validatedData.noteToApprover || null,
        profileAttachments: validatedData.profileAttachments || [],
      },
    });

    return NextResponse.json(updatedSupplier);
  } catch (error: any) {
    console.error('Failed to update supplier:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}
