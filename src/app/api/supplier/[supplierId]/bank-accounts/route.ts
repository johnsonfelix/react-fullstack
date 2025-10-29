import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/prisma';
import { bankAccountSchema } from '@/lib/validations/supplier';
import { ZodError } from 'zod';

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
    const body = await request.json();

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const accountsArray = Array.isArray(body) ? body : [body];
    // validate with Zod
    const validatedAccounts = accountsArray.map((account) => bankAccountSchema.parse(account));

    const createdAccounts = await prisma.$transaction(
      validatedAccounts.map((account) =>
        prisma.bankAccount.create({
          data: {
            country: account.country,
            currency: account.currency,
            accountType: account.accountType,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolder: account.accountHolder,
            bankBranch: (account as any).bankBranch ?? null,
            iban: (account as any).iban ?? null,
            swiftCode: (account as any).swiftCode ?? null,
            supplierId,
          },
        })
      )
    );

    return NextResponse.json(createdAccounts, { status: 201 });
  } catch (error: any) {
    console.error('Failed to add bank accounts:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add bank accounts' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supplierId = extractSupplierIdFromRequest(request);
  if (!supplierId) return NextResponse.json({ error: 'Missing supplierId in URL' }, { status: 400 });

  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(accounts, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch bank accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch bank accounts' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supplierId = extractSupplierIdFromRequest(request);
  if (!supplierId) return NextResponse.json({ error: 'Missing supplierId in URL' }, { status: 400 });

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // verify that account exists and belongs to supplier
    const acct = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!acct) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (acct.supplierId !== supplierId) {
      return NextResponse.json({ error: 'Account does not belong to supplier' }, { status: 403 });
    }

    await prisma.bankAccount.delete({ where: { id: accountId } });
    // return 204 No Content for deletion
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete bank account:', error);
    return NextResponse.json({ error: 'Failed to delete bank account' }, { status: 500 });
  }
}
