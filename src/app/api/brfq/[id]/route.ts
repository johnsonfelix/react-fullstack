// app/api/brfq/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/app/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
};

const S3_BUCKET = process.env.AWS_S3_BUCKET || "";
const S3_REGION = process.env.AWS_REGION || "";
const USE_S3 = Boolean(
  S3_BUCKET &&
  S3_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

let s3Client: S3Client | null = null;
if (USE_S3) {
  s3Client = new S3Client({
    region: S3_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

async function uploadFileToS3(buffer: Buffer, key: string, contentType: string) {
  if (!s3Client) throw new Error("S3 client not configured");
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "private",
  });
  await s3Client.send(cmd);
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

async function saveFileLocally(buffer: Buffer, destFileName: string) {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const destPath = path.join(uploadsDir, destFileName);
  await fs.promises.writeFile(destPath, buffer);
  return `/uploads/${destFileName}`;
}

function toDateTimeLocalString(d: any) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

function parseAttachmentPath(ap: any): string[] {
  if (!ap) return [];
  if (Array.isArray(ap)) return ap;
  if (typeof ap === "string") {
    try {
      const parsed = JSON.parse(ap);
      if (Array.isArray(parsed)) return parsed;
      return [ap];
    } catch {
      return [ap];
    }
  }
  return [];
}

function extractItemMetaFromDescription(desc: string) {
  if (!desc) return { description: "", meta: null };
  const marker = " | _meta:";
  const idx = desc.indexOf(marker);
  if (idx === -1) return { description: desc, meta: null };
  const base = desc.slice(0, idx);
  const jsonPart = desc.slice(idx + marker.length);
  try {
    const meta = JSON.parse(jsonPart);
    return { description: base, meta };
  } catch {
    return { description: base, meta: null };
  }
}

function parseDateOrNull(v: any) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function handleUpdateBRFQPayload(rfqData: any, attachments: string[]) {
  // Normalize and map the same way as create logic expects
  if (!rfqData.rfqId) rfqData.rfqId = `RFQ-${Date.now().toString(36).toUpperCase().slice(-8)}`;

  const openDateObj = parseDateOrNull(rfqData.openDateTime ?? rfqData.openDate ?? rfqData.open);
  const closeDateObj = parseDateOrNull(rfqData.closeDateTime ?? rfqData.closeDate ?? rfqData.closeTime) ?? new Date();
  const needByObj = parseDateOrNull(rfqData.needByDate ?? rfqData.need_by ?? rfqData.needByDateTime);
  const preferredDeliveryTime = rfqData.preferredDeliveryTime ?? null;

  const customerCategoryNormalized = Array.isArray(rfqData.categoryIds)
    ? rfqData.categoryIds
    : Array.isArray(rfqData.customerCategory)
    ? rfqData.customerCategory
    : [];

  const suppliersSelectedNormalized = Array.isArray(rfqData.suppliersSelected)
  ? rfqData.suppliersSelected.map((s: any) => {
      if (s && typeof s === "object") {
        // Defensive normalization: prefer various name keys and first/last name variants
        const rawName =
          (s.name ?? s.companyName ?? s.company ?? s.company_name ?? "").toString().trim();
        const first =
          (s.firstName ?? s.first_name ?? (s.name && typeof s.name === "string" && s.name.split(" ")[0]) ?? ""
          ).toString().trim();
        const last =
          (s.lastName ?? s.last_name ?? (s.name && typeof s.name === "string" && s.name.split(" ").slice(1).join(" ")) ?? ""
          ).toString().trim();
        const email = (s.email ?? s.registrationEmail ?? "").toString().trim();

        // derive a display name: prefer explicit name, then first+last, then company, then email local part
        let derivedName = rawName;
        if (!derivedName) {
          const fl = `${first} ${last}`.trim();
          if (fl) derivedName = fl;
          else if (s.companyName || s.company || s.company_name) derivedName = (s.companyName ?? s.company ?? s.company_name).toString().trim();
          else if (email) derivedName = email.split("@")[0];
        }
        // final fallbacks
        if (!derivedName) derivedName = `manual-${Date.now()}`;

        // build normalized object (convert empty strings -> null for clarity)
        const normalized: any = {
          id:
            s.id ??
            (email ? `manual-${email.replace(/[^a-z0-9]/gi, "")}-${Date.now()}` : `manual-${Date.now()}`),
          name: derivedName || null,
          email: email || null,
          firstName: first || null,
          lastName: last || null,
        };

        // preserve any additional fields without overwriting core ones
        for (const k of Object.keys(s)) {
          if (!["id", "name", "companyName", "company", "company_name", "firstName", "first_name", "lastName", "last_name", "email", "registrationEmail"].includes(k)) {
            normalized[k] = s[k];
          }
        }

        return normalized;
      }
      // string -> keep as-is (existing supplier id)
      return s;
    })
  : [];

  const brCurrentPrice = (typeof rfqData.currentPrice !== "undefined" && rfqData.currentPrice !== null && rfqData.currentPrice !== "") ? String(rfqData.currentPrice) : null;
  const brTargetPrice  = (typeof rfqData.targetPrice  !== "undefined" && rfqData.targetPrice  !== null && rfqData.targetPrice  !== "") ? String(rfqData.targetPrice)  : null;
  const brPrValue      = (typeof rfqData.prValue      !== "undefined" && rfqData.prValue      !== null && rfqData.prValue      !== "") ? String(rfqData.prValue)      : null;

  const incomingApprovalStatus = rfqData.approvalStatus ?? (rfqData.status === "approval_pending" ? "pending" : rfqData.approvalStatus ?? "none");
  const approvalRequestedBy = rfqData.approvalRequestedBy ?? null;
  const approvalRequestedAt = rfqData.approvalRequestedAt ? parseDateOrNull(rfqData.approvalRequestedAt) : (rfqData.status === "approval_pending" ? new Date() : null);
  const approvedBy = rfqData.approvedBy ?? null;
  const approvedAt = rfqData.approvedAt ? parseDateOrNull(rfqData.approvedAt) : (incomingApprovalStatus === "approved" ? new Date() : null);
  const approvalNote = rfqData.approvalNote ?? null;

  // Map items -> RequestItem model (preserve per-item price as _meta in description if provided)
  const itemsPayload = Array.isArray(rfqData.items)
    ? rfqData.items.map((it: any) => {
        const descriptionBase = (it.itemDescription ?? it.description ?? "").toString();
        const itemPrices: Record<string, any> = {};
        if (typeof it.currentPrice !== "undefined") itemPrices.currentPrice = it.currentPrice;
        if (typeof it.targetPrice !== "undefined")  itemPrices.targetPrice = it.targetPrice;
        if (typeof it.prValue !== "undefined")      itemPrices.prValue = it.prValue;

        const priceSuffix = Object.keys(itemPrices).length ? ` | _meta:${JSON.stringify(itemPrices)}` : "";
        return {
          internalPartNo: it.itemNumber ?? it.internalPartNo ?? null,
          manufacturer: it.brandManufacturer ?? it.manufacturer ?? null,
          mfgPartNo: it.mfgPartNo ?? null,
          description: `${descriptionBase}${priceSuffix}`,
          uom: it.uom ?? it.UOM ?? "",
          quantity: typeof it.estQuantity !== "undefined" && it.estQuantity !== "" ? Number(it.estQuantity) : (typeof it.quantity !== "undefined" ? Number(it.quantity) : 0),
        };
      })
    : [];

  // Build payload for prisma update/create
  const payloadForPrisma = {
    title: rfqData.title ?? "Untitled RFQ",
    openDate: openDateObj,
    closeDate: closeDateObj,
    closeTime: closeDateObj,
    needByDate: needByObj,
    preferredDeliveryTime,
    requester: rfqData.requester ?? rfqData.requesterReference ?? null,
    shippingAddress: rfqData.shippingAddress ?? null,
    paymentProcess: rfqData.paymentProcess ?? "",
    currency: rfqData.currency ?? "",
    shippingType: rfqData.shippingType ?? null,
    carrier: rfqData.carrier ?? null,
    urgency: rfqData.urgency ?? null,
    notesToSupplier: rfqData.noteToSupplier ?? null,
    incoterms: rfqData.incoterms ?? null,
    origin: rfqData.origin ?? null,
    currentPrice: brCurrentPrice ?? null,
    targetPrice: brTargetPrice ?? null,
    prValue: brPrValue ?? null,
    productSpecification: rfqData.productSpecification ?? null,
    customerCategory: customerCategoryNormalized,
    suppliersSelected: suppliersSelectedNormalized,
    suppliers: rfqData.suppliers ?? [],
    status: rfqData.status ?? "draft",
    publishOnApproval: !!rfqData.publishOnApproval,
    approvalStatus: incomingApprovalStatus ?? "none",
    approvalRequestedBy: approvalRequestedBy ?? null,
    approvalRequestedAt: approvalRequestedAt ?? null,
    approvedBy: approvedBy ?? null,
    approvedAt: approvedAt ?? null,
    approvalNote: approvalNote ?? null,
    published: incomingApprovalStatus === "approved" ? true : !!rfqData.published,
    attachmentPath: attachments.length ? JSON.stringify(attachments) : null,
    itemsPayload,
  };

  return payloadForPrisma;
}

/* ---------------------------
   GET handler (unchanged)
   --------------------------- */
export async function GET(req: NextRequest) {
  try {
    const parts = req.nextUrl.pathname.split("/").filter(Boolean);
    const idOrRfqId = parts[parts.length - 1];
    if (!idOrRfqId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400, headers: CORS_HEADERS });
    }

    let brfq = await prisma.bRFQ.findUnique({
      where: { id: idOrRfqId },
      include: { items: true, quotes: { include: { items: true } } },
    });

    if (!brfq) {
      brfq = await prisma.bRFQ.findUnique({
        where: { rfqId: idOrRfqId },
        include: { items: true, quotes: { include: { items: true } } },
      });
    }

    if (!brfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404, headers: CORS_HEADERS });
    }

    let supplierRecords: any[] = [];
    if (Array.isArray(brfq.suppliers) && brfq.suppliers.length > 0) {
      try {
        supplierRecords = await prisma.supplier.findMany({
          where: { id: { in: brfq.suppliers } },
          select: { id: true, companyName: true, registrationEmail: true, website: true, country: true, registrationStatus: true, status: true, createdAt: true, updatedAt: true },
        });
      } catch (err) {
        console.warn("Could not expand brfq.suppliers:", err);
      }
    }

    const suppliersSelectedNormalized = Array.isArray(brfq.suppliersSelected)
      ? brfq.suppliersSelected.map((s: any) => (typeof s === "string" ? { id: s, email: "" } : { id: s.id ?? s, email: s.email ?? "" }))
      : [];

    const categoryIds = Array.isArray(brfq.customerCategory) ? brfq.customerCategory : [];
    const attachments = parseAttachmentPath(brfq.attachmentPath);

    const items = Array.isArray(brfq.items)
      ? brfq.items.map((it: any, idx: number) => {
          const { description, meta } = extractItemMetaFromDescription(it.description ?? "");
          return {
            id: it.id,
            lineNo: idx + 1,
            lineType: (it as any).lineType ?? "Goods",
            itemNumber: it.internalPartNo ?? null,
            itemDescription: description ?? "",
            brandManufacturer: it.manufacturer ?? "",
            origin: it.origin ?? it.mfgPartNo ?? "",
            estQuantity: typeof it.quantity !== "undefined" ? Number(it.quantity) : 0,
            uom: it.uom ?? "",
            currentPrice: meta?.currentPrice ?? null,
            targetPrice: meta?.targetPrice ?? null,
            prValue: meta?.prValue ?? null,
            raw: it,
          };
        })
      : [];

    const quotes = Array.isArray(brfq.quotes)
      ? brfq.quotes.map((q: any) => ({
          id: q.id,
          supplierId: q.supplierId,
          supplierQuoteNo: q.supplierQuoteNo ?? null,
          validFor: q.validFor ?? null,
          currency: q.currency ?? null,
          shipping: q.shipping ?? null,
          comments: q.comments ?? null,
          createdAt: q.createdAt ? q.createdAt.toISOString() : null,
          items: Array.isArray(q.items) ? q.items.map((qi: any) => ({ id: qi.id, supplierPartNo: qi.supplierPartNo, deliveryDays: qi.deliveryDays, unitPrice: qi.unitPrice, qty: qi.qty, uom: qi.uom, cost: qi.cost, raw: qi })) : [],
          raw: q,
        }))
      : [];

    const normalized = {
      id: brfq.id,
      rfqId: brfq.rfqId ?? brfq.id,
      title: brfq.title ?? "",
      status: brfq.status ?? brfq.approvalStatus ?? "draft",
      publishOnApproval: !!brfq.publishOnApproval,
      approvalStatus: brfq.approvalStatus ?? "none",
      approvalRequestedBy: brfq.approvalRequestedBy ?? null,
      approvalRequestedAt: brfq.approvalRequestedAt ? toDateTimeLocalString(brfq.approvalRequestedAt) : null,
      approvedBy: brfq.approvedBy ?? null,
      approvedAt: brfq.approvedAt ? toDateTimeLocalString(brfq.approvedAt) : null,
      approvalNote: brfq.approvalNote ?? null,
      published: !!brfq.published,

      createdAt: brfq.createdAt ? brfq.createdAt.toISOString() : null,
      updatedAt: brfq.updatedAt ? brfq.updatedAt.toISOString() : null,

      openDateTime: brfq.openDate ? toDateTimeLocalString(brfq.openDate) : "",
      closeDateTime: brfq.closeDate ? toDateTimeLocalString(brfq.closeDate) : (brfq.closeTime ? toDateTimeLocalString(brfq.closeTime) : ""),
      closeTime: brfq.closeTime ? toDateTimeLocalString(brfq.closeTime) : "",
      needByDate: brfq.needByDate ? (new Date(brfq.needByDate)).toISOString().slice(0, 10) : "",
      preferredDeliveryTime: brfq.preferredDeliveryTime ?? "",

      requesterReference: brfq.requester ?? "",
      shippingAddress: brfq.shippingAddress ?? "",
      paymentProcess: brfq.paymentProcess ?? "",
      currency: brfq.currency ?? "",
      shippingType: brfq.shippingType ?? "",
      carrier: brfq.carrier ?? "",
      urgency: brfq.urgency ?? "",
      incoterms: brfq.incoterms ?? "",
      origin: brfq.origin ?? "",
      noteToSupplier: brfq.notesToSupplier ?? brfq.notesToSupplier ?? "",
      productSpecification: brfq.productSpecification ?? "",

      currentPrice: brfq.currentPrice ?? null,
      targetPrice: brfq.targetPrice ?? null,
      prValue: brfq.prValue ?? null,

      categoryIds,
      suppliersSelected: suppliersSelectedNormalized,
      suppliers: supplierRecords,
      attachments,

      items,
      quotes,
      raw: brfq,
    };

    return NextResponse.json(normalized, { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    console.error("Error fetching RFQ:", err);
    return NextResponse.json({ error: "Failed to fetch RFQ" }, { status: 500, headers: CORS_HEADERS });
  }
}

/* ---------------------------
   PUT handler (update)
   Accepts multipart/form-data or application/json
   --------------------------- */
export async function PUT(req: NextRequest) {
  try {
    const parts = req.nextUrl.pathname.split("/").filter(Boolean);
    const idOrRfqId = parts[parts.length - 1];
    if (!idOrRfqId) return NextResponse.json({ error: "Missing id" }, { status: 400, headers: CORS_HEADERS });

    const contentType = (req.headers.get("content-type") || "").toLowerCase();

    // normalized containers
    let rfqData: any = {};
    let existingAttachments: string[] = [];
    const attachments: string[] = [];

    if (contentType.includes("application/json")) {
      const body = await req.json();
      rfqData = body?.rfqData ? body.rfqData : body ?? {};
      if (body?.existingAttachments) existingAttachments = Array.isArray(body.existingAttachments) ? body.existingAttachments : [];
      attachments.push(...existingAttachments);
    } else {
      // multipart/form-data
      const formData = await req.formData();
      const rfqDataRaw = formData.get("rfqData") as string | null;
      if (!rfqDataRaw) {
        return NextResponse.json({ error: "Missing rfqData" }, { status: 400, headers: CORS_HEADERS });
      }
      try {
        rfqData = JSON.parse(rfqDataRaw);
      } catch {
        rfqData = rfqDataRaw as any;
      }

      const existingRaw = formData.get("existingAttachments") as string | null;
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) existingAttachments = parsed;
        } catch { /* ignore */ }
      }

      const files = formData.getAll("files");
      for (const file of files) {
        if (!(file instanceof File)) continue;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = path.extname(file.name) || "";
        const destName = `${uuidv4()}${ext}`;

        if (USE_S3) {
          const key = `brfq/${rfqData.rfqId ?? idOrRfqId}/${destName}`;
          const url = await uploadFileToS3(buffer, key, (file as File).type || "application/octet-stream");
          attachments.push(url);
        } else {
          const url = await saveFileLocally(buffer, destName);
          attachments.push(url);
        }
      }

      attachments.push(...existingAttachments);
    }

    // find existing record by id or rfqId
    let existing = await prisma.bRFQ.findUnique({ where: { id: idOrRfqId } });
    if (!existing) {
      existing = await prisma.bRFQ.findUnique({ where: { rfqId: idOrRfqId } });
      if (!existing) {
        return NextResponse.json({ error: "RFQ not found" }, { status: 404, headers: CORS_HEADERS });
      }
    }

    // prepare payload
    const prismaPayload = await handleUpdateBRFQPayload(rfqData, attachments);

    // perform update (delete existing items and recreate)
    const updated = await prisma.bRFQ.update({
      where: { id: existing.id },
      data: {
        title: prismaPayload.title,
        openDate: prismaPayload.openDate,
        closeDate: prismaPayload.closeDate,
        closeTime: prismaPayload.closeTime,
        needByDate: prismaPayload.needByDate,
        preferredDeliveryTime: prismaPayload.preferredDeliveryTime,
        requester: prismaPayload.requester,
        shippingAddress: prismaPayload.shippingAddress,
        paymentProcess: prismaPayload.paymentProcess,
        currency: prismaPayload.currency,
        shippingType: prismaPayload.shippingType,
        carrier: prismaPayload.carrier,
        urgency: prismaPayload.urgency,
        notesToSupplier: prismaPayload.notesToSupplier,
        incoterms: prismaPayload.incoterms,
        origin: prismaPayload.origin,
        currentPrice: prismaPayload.currentPrice,
        targetPrice: prismaPayload.targetPrice,
        prValue: prismaPayload.prValue,
        productSpecification: prismaPayload.productSpecification,
        customerCategory: prismaPayload.customerCategory,
        suppliersSelected: prismaPayload.suppliersSelected,
        suppliers: prismaPayload.suppliers,
        status: prismaPayload.status,
        publishOnApproval: prismaPayload.publishOnApproval,
        approvalStatus: prismaPayload.approvalStatus,
        approvalRequestedBy: prismaPayload.approvalRequestedBy,
        approvalRequestedAt: prismaPayload.approvalRequestedAt,
        approvedBy: prismaPayload.approvedBy,
        approvedAt: prismaPayload.approvedAt,
        approvalNote: prismaPayload.approvalNote,
        published: prismaPayload.published,
        attachmentPath: prismaPayload.attachmentPath,

        items: {
          deleteMany: {},
          create: prismaPayload.itemsPayload,
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("Error updating RFQ:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to update RFQ" }, { status: 500, headers: CORS_HEADERS });
  }
}

/* ---------------------------
   DELETE handler (unchanged)
   --------------------------- */
export async function DELETE(req: NextRequest) {
  try {
    const parts = req.nextUrl.pathname.split("/").filter(Boolean);
    const idOrRfqId = parts[parts.length - 1];
    if (!idOrRfqId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // 1️⃣ Find by id or rfqId
    let brfq = await prisma.bRFQ.findUnique({ where: { id: idOrRfqId } });

    if (!brfq) {
      brfq = await prisma.bRFQ.findUnique({ where: { rfqId: idOrRfqId } });
    }

    if (!brfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    const brfqId = brfq.id;

    // 2️⃣ Delete children first (since onDelete is missing in schema)
    await prisma.quoteItem.deleteMany({
      where: { quote: { rfqId: brfqId } },
    });

    await prisma.quote.deleteMany({
      where: { rfqId: brfqId },
    });

    await prisma.requestItem.deleteMany({
      where: { brfqId },
    });

    // 3️⃣ Now delete the RFQ
    const deleted = await prisma.bRFQ.delete({
      where: { id: brfqId },
    });

    return NextResponse.json(
      { message: "RFQ deleted", brfq: deleted },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unhandled error deleting RFQ:", err);
    return NextResponse.json(
      { error: "Failed to delete RFQ" },
      { status: 500 }
    );
  }
}

