// app/api/suppliers/quote/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: false }
};

const prisma = new PrismaClient();

async function saveFiles(files: formidable.File[] | formidable.File | undefined) {
  if (!files) return [];
  const saved: string[] = [];
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const fileList = Array.isArray(files) ? files : [files];
  for (const f of fileList) {
    if (!f || !f.filepath) continue;
    const origName = f.originalFilename || 'file';
    const ext = path.extname(origName);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    const dest = path.join(uploadDir, filename);
    await fs.promises.copyFile(f.filepath, dest);
    saved.push(`/uploads/${filename}`);
    try { if (fs.existsSync(f.filepath)) await fs.promises.unlink(f.filepath); } catch {}
  }
  return saved;
}

async function parseForm(req: Request) {
  return new Promise<{ fields: any; files: any }>((resolve, reject) => {
    const form = formidable({ multiples: true, keepExtensions: true });
    // @ts-ignore
    form.parse(req as any, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let payload: any = null;
    let savedFiles: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const { fields, files } = await parseForm(req);
      if (fields.payload) {
        try { payload = JSON.parse(fields.payload as string); } catch { payload = fields.payload; }
      } else {
        payload = fields;
      }
      const fileField = (files && (files.files || files.file || files['files[]'])) || null;
      savedFiles = await saveFiles(fileField);
    } else {
      payload = await req.json();
    }

    if (!payload) return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    const { token, rfqId, supplierId, supplierQuoteNo, validFor, currency, items = [], comments = '', shipping = '' } = payload;
    if (!rfqId || !supplierId) return NextResponse.json({ error: 'rfqId and supplierId required' }, { status: 400 });

    // OPTIONAL: server-side token verification hook
    // TODO: verify token here if you need to.

    // --- Duplicate check: ensure supplier hasn't already submitted a quote for this RFQ
    const existing = await prisma.quote.findFirst({
      where: { rfqId: rfqId, supplierId: supplierId },
      include: { items: true }
    });

    if (existing) {
      // Option A: Reject duplicate submissions
      return NextResponse.json({ error: 'Duplicate quote: a quote from this supplier already exists for this RFQ', quoteId: existing.id }, { status: 409 });

      // --------------------------------------
      // Option B (ALTERNATIVE): Upsert (replace existing)
      // If you'd prefer to update the existing quote instead of rejecting,
      // comment out the return above and uncomment the code below.
      //
      // // delete existing items then recreate with the new ones:
      // await prisma.quoteItem.deleteMany({ where: { quoteId: existing.id } });
      // const updated = await prisma.quote.update({
      //   where: { id: existing.id },
      //   data: {
      //     supplierQuoteNo: supplierQuoteNo ?? existing.supplierQuoteNo,
      //     validFor: validFor ?? existing.validFor,
      //     currency: currency ?? existing.currency,
      //     shipping: shipping ?? existing.shipping,
      //     comments: comments ?? existing.comments,
      //     items: {
      //       create: (Array.isArray(items) ? items.map((it: any) => ({
      //         supplierPartNo: it.supplierPartNo ?? (it.itemRef ? String(it.itemRef) : ''),
      //         deliveryDays: it.deliveryDays ?? '',
      //         unitPrice: (it.unitPrice !== undefined && it.unitPrice !== null) ? String(it.unitPrice) : '',
      //         qty: it.qty ?? '',
      //         uom: it.uom ?? '',
      //         cost: Number(it.cost ?? 0),
      //       })) : [])
      //     }
      //   },
      //   include: { items: true }
      // });
      // return NextResponse.json({ success: true, updated }, { status: 200 });
      // --------------------------------------
    }

    // No existing quote — create a new one
    const created = await prisma.quote.create({
      data: {
        supplierQuoteNo: supplierQuoteNo ?? '',
        validFor: validFor ?? '',
        currency: currency ?? '',
        shipping: shipping ?? '',
        comments: comments ?? '',
        rfqId,
        supplierId,
        items: {
          create: (Array.isArray(items) ? items.map((it: any) => ({
            supplierPartNo: it.supplierPartNo ?? (it.itemRef ? String(it.itemRef) : ''),
            deliveryDays: it.deliveryDays ?? '',
            unitPrice: (it.unitPrice !== undefined && it.unitPrice !== null) ? String(it.unitPrice) : '',
            qty: it.qty ?? '',
            uom: it.uom ?? '',
            cost: Number(it.cost ?? 0),
          })) : [])
        }
      },
      include: { items: true }
    });

    // If files were uploaded, return their urls. Optionally persist them to DB if you add fields.
    return NextResponse.json({ success: true, quote: created, files: savedFiles }, { status: 201 });

  } catch (err: any) {
    console.error('Error creating quote:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
