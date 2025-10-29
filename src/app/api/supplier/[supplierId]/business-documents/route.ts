import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/prisma';
import { businessDocumentSchema } from '@/lib/validations/supplier';
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

    const documentsArray = Array.isArray(body) ? body : [body];

    // Validate with Zod
    const validatedDocuments = documentsArray.map((doc) => businessDocumentSchema.parse(doc));

    const createdDocuments = await prisma.$transaction(
      validatedDocuments.map((doc) =>
        prisma.businessDocument.create({
          data: {
            classification: doc.classification,
            subClassification: doc.subClassification ?? null,
            certifyingAgency: doc.certifyingAgency ?? null,
            certificateNumber: doc.certificateNumber ?? null,
            certificateStartDate: doc.certificateStartDate ? new Date(doc.certificateStartDate) : null,
            certificateEndDate: doc.certificateEndDate ? new Date(doc.certificateEndDate) : null,
            otherCertifyingAgency: (doc as any).otherCertifyingAgency ?? null,
            notes: doc.notes ?? null,
            attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
            supplierId,
          },
        })
      )
    );

    return NextResponse.json(createdDocuments, { status: 201 });
  } catch (error: any) {
    console.error('Failed to add business documents:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add business documents' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supplierId = extractSupplierIdFromRequest(request);
  if (!supplierId) return NextResponse.json({ error: 'Missing supplierId in URL' }, { status: 400 });

  try {
    const documents = await prisma.businessDocument.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(documents, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch business documents:', error);
    return NextResponse.json({ error: 'Failed to fetch business documents' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supplierId = extractSupplierIdFromRequest(request);
  if (!supplierId) return NextResponse.json({ error: 'Missing supplierId in URL' }, { status: 400 });

  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // verify document belongs to supplier
    const doc = await prisma.businessDocument.findUnique({ where: { id: documentId } });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    if (doc.supplierId !== supplierId) {
      return NextResponse.json({ error: 'Document does not belong to supplier' }, { status: 403 });
    }

    await prisma.businessDocument.delete({ where: { id: documentId } });

    // 204 No Content is standard for successful delete
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete business document:', error);
    return NextResponse.json({ error: 'Failed to delete business document' }, { status: 500 });
  }
}
