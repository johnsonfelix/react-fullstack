import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendRFQEmails } from '../lib/mail';
import { generateRFQEmail } from '../lib/email-template/rfqTemplate';
import { generateQuoteToken } from '../lib/jwt';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function GET() {
  const events = await prisma.bRFQ.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
    },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  try {
    // Create form data from request
    const formData = await req.formData();
    
    // Get JSON data
    const rfqData = formData.get('rfqData');
    if (!rfqData || typeof rfqData !== 'string') {
      throw new Error('Missing RFQ data');
    }
    
    const body = JSON.parse(rfqData);
    console.log('BRFQ BODY:', body);

    // Process files
    const files = formData.getAll('files') as File[];
    let attachmentPath: string | null = null;
    const filePaths: string[] = [];

    if (files.length > 0) {
      // Create upload directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Process each file
      for (const file of files) {
        // Validate file type
        const validTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/png',
        ];
        
        if (!validTypes.includes(file.type)) {
          throw new Error(`Invalid file type: ${file.type}`);
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File too large: ${file.name}`);
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const timestamp = Date.now();
        const ext = path.extname(file.name);
        const filename = `${timestamp}-${file.name.replace(ext, '')}${ext}`;
        const filePath = path.join(uploadDir, filename);

        // Write file to disk
        await fs.promises.writeFile(filePath, buffer);
        filePaths.push(`/uploads/${filename}`);
      }

      attachmentPath = filePaths.join('|');
    }

    // Extract IDs and Emails separately
    const supplierIds = body.suppliersSelected.map((s: any) => s.id);
    const supplierEmails = body.suppliersSelected.map((s: any) => s.email).filter(Boolean);
    const supplierObjects = Array.isArray(body.suppliersSelected) ? body.suppliersSelected : [];


    const createdBRFQ = await prisma.bRFQ.create({
      data: {
        title: body.title,
        closeDate: new Date(body.closeDate),
        closeTime: new Date(`${body.closeDate}T${body.closeTime}`),
        preferredDeliveryTime: body.preferredDeliveryTime,
        requester: body.requesterReference,
        rfqId: body.rfqId,
        shippingAddress: body.shippingAddress,
        paymentProcess: body.paymentProcess,
        currency: body.currency,
        shippingType: body.shippingType,
        carrier: body.carrier,
        urgency: body.urgency,
        customerCategory: body.categoryIds,
        notesToSupplier: body.noteToSupplier || '',
        productSpecification: body.productSpecification || '',
        suppliersSelected: supplierObjects,
        attachmentPath: attachmentPath || null,
      },
    });

    if (Array.isArray(body.items) && body.items.length > 0) {
      await prisma.requestItem.createMany({
        data: body.items.map((item: any) => ({
          brfqId: createdBRFQ.id,
          internalPartNo: item.internalPartNo,
          manufacturer: item.manufacturer,
          mfgPartNo: item.mfgPartNo.toString(),
          description: item.description,
          uom: item.uom,
          quantity: Number(item.quantity),
        })),
      });
    }

    // Send RFQ Email Notification
    for (const supplier of body.suppliersSelected) {
      if (!supplier.email) continue;
    
      const token = generateQuoteToken({
        rfqId: createdBRFQ.id,
        supplierId: supplier.id,
      });
    
      const link = `${process.env.NEXT_PUBLIC_BASE_URL}/supplier/submit-quote?token=${token}`;
      const register = `${process.env.NEXT_PUBLIC_BASE_URL}/sign-up`;
    
      const message = generateRFQEmail({
        title: createdBRFQ.title,
        closeDate: body.closeDate,
        closeTime: body.closeTime,
        noteToSupplier: body.noteToSupplier,
        quoteLink: link,
        register: register,
      });
    
      await sendRFQEmails([supplier.email], `New RFQ: ${createdBRFQ.title}`, message);
    }

    return NextResponse.json({ 
      success: true,
      message: 'RFQ created and emails sent', 
      data: createdBRFQ,
      attachments: filePaths
    });

  } catch (error) {
    console.error('POST /api/brfq error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create RFQ',
        details: error instanceof Error ? error.stack : null
      }, 
      { status: 500 }
    );
  }
}