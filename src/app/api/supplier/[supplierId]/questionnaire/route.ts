import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/prisma';
import { questionnaireSchema } from '@/lib/validations/supplier';
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

    // Validate incoming questionnaire payload
    const validatedData = questionnaireSchema.parse(body);

    // Normalize boolean values or defaults according to your existing mapping
    const payload = {
      hasQualityManagementSystem: !!validatedData.hasReadSupplierCode,
      hasEnvironmentalCertification: !!validatedData.hasNoConflictOfInterest,
      hasHealthSafetyCertification: !!validatedData.isUAERegistered,
      acceptsTermsAndConditions: !!validatedData.hasReadSupplierCode,
      hasBusinessLicense: !!validatedData.isUAERegistered,
      hasTaxCertificate: !!validatedData.hasBankAccountInfo,
      hasInsuranceCertificate: !!validatedData.hasESGFeedback,
      hasFoodSafetyCertificate: !!validatedData.isFoodBeverageProvider,
      additionalNotes: validatedData.additionalNotes ?? null,
    };

    // Upsert-like behavior: update if exists, otherwise create
    const existing = await prisma.questionnaireResponse.findUnique({ where: { supplierId } });

    let questionnaireResponse;
    if (existing) {
      questionnaireResponse = await prisma.questionnaireResponse.update({
        where: { supplierId },
        data: payload,
      });
    } else {
      questionnaireResponse = await prisma.questionnaireResponse.create({
        data: {
          supplierId,
          ...payload,
        },
      });
    }

    // Update supplier submittedAt (and optionally registrationStatus if needed)
    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        submittedAt: new Date(),
      },
    });

    return NextResponse.json(questionnaireResponse, { status: existing ? 200 : 201 });
  } catch (error: any) {
    console.error('Failed to save questionnaire:', error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to save questionnaire' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supplierId = extractSupplierIdFromRequest(request);
  if (!supplierId) return NextResponse.json({ error: 'Missing supplierId in URL' }, { status: 400 });

  try {
    const questionnaire = await prisma.questionnaireResponse.findUnique({ where: { supplierId } });
    if (!questionnaire) return NextResponse.json(null, { status: 204 });
    return NextResponse.json(questionnaire, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch questionnaire:', error);
    return NextResponse.json({ error: 'Failed to fetch questionnaire' }, { status: 500 });
  }
}
