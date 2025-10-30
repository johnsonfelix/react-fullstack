import { NextRequest, NextResponse } from 'next/server';
import { companyDetailsSchema } from '@/lib/validations/supplier';
import prisma from "@/app/prisma";

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('id');

    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        include: {
          contacts: true,
          addresses: true,
          businessDocuments: true,
          bankAccounts: true,
          productCategories: {
            include: {
              productCategory: true,
            },
          },
          questionnaireResponse: true,
        },
      });

      if (!supplier) {
        return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
      }
      return NextResponse.json(supplier);
    }

    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('Failed to fetch supplier(s):', error);
    return NextResponse.json({ error: 'Failed to fetch supplier(s)' }, { status: 500 });
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
