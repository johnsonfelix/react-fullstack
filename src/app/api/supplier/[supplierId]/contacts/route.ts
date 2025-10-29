import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/prisma';
import { contactSchema } from '@/lib/validations/supplier';
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

    const contactsArray = Array.isArray(body) ? body : [body];

    // Validate with Zod
    const validatedContacts = contactsArray.map((contact) => contactSchema.parse(contact));

    const createdContacts = await prisma.$transaction(
      validatedContacts.map((contact) =>
        prisma.contact.create({
          data: {
            firstName: contact.firstName,
            lastName: contact.lastName ?? null,
            email: contact.email,
            designation: contact.designation ?? null,
            countryCode: contact.countryCode,
            mobile: contact.mobile,
            phone: (contact as any).phone ?? null,
            ext: (contact as any).ext ?? null,
            isAdministrativeContact: !!contact.isAdministrativeContact,
            needsUserAccount: !!contact.needsUserAccount,
            supplierId,
          },
        })
      )
    );

    return NextResponse.json(createdContacts, { status: 201 });
  } catch (error: any) {
    console.error('Failed to add contacts:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add contacts' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supplierId = extractSupplierIdFromRequest(request);
  if (!supplierId) return NextResponse.json({ error: 'Missing supplierId in URL' }, { status: 400 });

  try {
    const contacts = await prisma.contact.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(contacts, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supplierId = extractSupplierIdFromRequest(request);
  if (!supplierId) return NextResponse.json({ error: 'Missing supplierId in URL' }, { status: 400 });

  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    if (contact.supplierId !== supplierId) {
      return NextResponse.json({ error: 'Contact does not belong to supplier' }, { status: 403 });
    }

    await prisma.contact.delete({ where: { id: contactId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
