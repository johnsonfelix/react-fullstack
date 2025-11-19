// app/api/brfq/draft/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/app/prisma"; // adjust if your prisma client path differs
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

function generateRfqId() {
  return `RFQ-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

/* -----------------------
   Supplier normalization + DB upsert helpers
   ----------------------- */

/**
 * Accepts many incoming shapes and returns normalized supplier object:
 * { id, name, email, firstName, lastName, ...other }
 */
function normalizeSupplier(raw: any) {
  if (!raw) return null;
  if (typeof raw === "string") {
    // string probably an existing supplier id
    return { id: raw, name: null, email: null, firstName: null, lastName: null };
  }
  // Accept many variants
  const email = (raw.email ?? raw.registrationEmail ?? raw.user?.email ?? raw.registration_email ?? "").toString().trim();
  const rawName = (raw.name ?? raw.companyName ?? raw.company ?? raw.company_name ?? "").toString().trim();
  const first = (raw.firstName ?? raw.first_name ?? (raw.name && typeof raw.name === "string" ? raw.name.split(" ")[0] : "") ?? "").toString().trim();
  const last = (raw.lastName ?? raw.last_name ?? (raw.name && typeof raw.name === "string" ? raw.name.split(" ").slice(1).join(" ") : "") ?? "").toString().trim();

  // derive display name if missing
  let derivedName = rawName;
  if (!derivedName) {
    const fl = `${first} ${last}`.trim();
    if (fl) derivedName = fl;
    else if (raw.companyName || raw.company || raw.company_name) derivedName = (raw.companyName ?? raw.company ?? raw.company_name).toString().trim();
    else if (email) derivedName = email.split("@")[0];
  }
  if (!derivedName) derivedName = `manual-${Date.now().toString(36).slice(-6)}`;

  // Build id if missing (we keep predictable manual-... ids)
  const id =
    raw.id ??
    (email ? `manual-${email.replace(/[^a-z0-9]/gi, "")}-${Date.now()}` : `manual-${Date.now()}`);

  const normalized: Record<string, any> = {
    id: id.toString(),
    name: derivedName || null,
    email: email || null,
    firstName: first || null,
    lastName: last || null,
  };

  // copy over other useful fields (phone, city, state etc.) without overwriting core keys
  for (const k of Object.keys(raw)) {
    if (!["id", "name", "companyName", "company", "company_name", "firstName", "first_name", "lastName", "last_name", "email", "registrationEmail", "user"].includes(k)) {
      normalized[k] = raw[k];
    }
  }

  return normalized;
}

/**
 * Upsert supplier rows for manual suppliers so they exist in supplier table.
 * - accepts array of normalized supplier objects
 * - returns array of supplier ids (string) and the supplier objects (possibly enriched)
 */
async function ensureSuppliersInDb(suppliers: Array<any>) {
  const savedObjects: any[] = [];
  const ids: string[] = [];

  for (const s of suppliers) {
    if (!s) continue;
    // if s is a string id, try to load supplier
    if (typeof s === "string") {
      const existing = await prisma.supplier.findUnique({ where: { id: s } }).catch(() => null);
      if (existing) {
        savedObjects.push({ id: existing.id, companyName: existing.companyName ?? existing.name ?? null, registrationEmail: existing.registrationEmail ?? null, ...existing });
        ids.push(existing.id);
        continue;
      } else {
        // keep string id as-is (no DB row)
        ids.push(s);
        savedObjects.push({ id: s, name: s });
        continue;
      }
    }

    // For object, decide whether it's an existing supplier id or manual
    const supplierId = s.id?.toString?.() ?? null;

    if (supplierId) {
      try {
        const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
        if (existing) {
          // optionally update missing fields (non-destructive)
          const updates: any = {};
          if (!existing.companyName && (s.name || s.companyName)) updates.companyName = s.name ?? s.companyName;
          if (!existing.registrationEmail && s.email) updates.registrationEmail = s.email;
          if (Object.keys(updates).length > 0) {
            await prisma.supplier.update({ where: { id: supplierId }, data: updates }).catch(() => {});
          }
          savedObjects.push({ id: existing.id, companyName: existing.companyName ?? s.name ?? null, registrationEmail: existing.registrationEmail ?? s.email ?? null, ...existing });
          ids.push(existing.id);
          continue;
        }
      } catch (e) {
        // ignore db errors and attempt create below
      }

      // not found in suppliers table -> create new supplier row
      try {
        const toCreate: any = {
          id: supplierId,
          companyName: s.name ?? s.companyName ?? null,
          registrationEmail: s.email ?? s.registrationEmail ?? null,
          website: s.website ?? null,
          country: s.country ?? null,
          // set sensible defaults for registrationStatus / status if your schema expects them:
          registrationStatus: s.registrationStatus ?? "manual",
          status: s.status ?? "active",
        };
        const created = await prisma.supplier.create({ data: toCreate });
        savedObjects.push({ id: created.id, companyName: created.companyName, registrationEmail: created.registrationEmail, ...created });
        ids.push(created.id);
        continue;
      } catch (err) {
        // fallback: keep the normalized id even if DB create failed
        ids.push(supplierId);
        savedObjects.push(s);
        continue;
      }
    } else {
      // no id present: generate one and try create
      const genId = `manual-${Date.now().toString(36).slice(-6)}`;
      try {
        const toCreate: any = {
          id: genId,
          companyName: s.name ?? s.companyName ?? null,
          registrationEmail: s.email ?? s.registrationEmail ?? null,
          website: s.website ?? null,
          country: s.country ?? null,
          registrationStatus: s.registrationStatus ?? "manual",
          status: s.status ?? "active",
        };
        const created = await prisma.supplier.create({ data: toCreate });
        savedObjects.push({ id: created.id, companyName: created.companyName, registrationEmail: created.registrationEmail, ...created });
        ids.push(created.id);
      } catch (err) {
        // fallback
        s.id = genId;
        savedObjects.push(s);
        ids.push(genId);
      }
    }
  }

  return { ids, savedObjects };
}

/* ---------------------------
   OPTIONS
   --------------------------- */
export async function OPTIONS() {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };
  return new NextResponse(null, { status: 200, headers });
}

/* ---------------------------
   POST (draft create/update)
   --------------------------- */
export async function POST(req: Request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
  };

  try {
    const contentType = (req.headers.get("content-type") || "").toLowerCase();

    // Normalized containers
    let rfqData: any = {};
    let existingAttachments: string[] = [];
    const attachments: string[] = [];

    // --- Accept JSON or multipart/form-data ---
    if (contentType.includes("application/json")) {
      const body = await req.json();
      // support both envelope { rfqData: {...} } or direct rfq object
      rfqData = body?.rfqData ? body.rfqData : body ?? {};
      if (body?.existingAttachments) {
        existingAttachments = Array.isArray(body.existingAttachments) ? body.existingAttachments : [];
      }
      attachments.push(...existingAttachments);
    } else {
      // Expect multipart/form-data
      const formData = await req.formData();

      const rfqDataRaw = formData.get("rfqData") as string | null;
      if (!rfqDataRaw) {
        return NextResponse.json({ error: "Missing rfqData" }, { status: 400, headers: corsHeaders });
      }
      try {
        rfqData = JSON.parse(rfqDataRaw);
      } catch {
        // some clients might have directly sent an object-like value; accept as-is
        rfqData = rfqDataRaw as any;
      }

      const existingRaw = formData.get("existingAttachments") as string | null;
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) existingAttachments = parsed;
        } catch {
          // ignore parse error
        }
      }

      // process file uploads
      const files = formData.getAll("files");
      for (const file of files) {
        if (!(file instanceof File)) continue;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = path.extname(file.name) || "";
        const destName = `${uuidv4()}${ext}`;

        if (USE_S3) {
          const key = `brfq/${rfqData.rfqId ?? generateRfqId()}/${destName}`;
          const url = await uploadFileToS3(buffer, key, (file as File).type || "application/octet-stream");
          attachments.push(url);
        } else {
          const url = await saveFileLocally(buffer, destName);
          attachments.push(url);
        }
      }

      attachments.push(...existingAttachments);
    }

    // Ensure rfqId exists
    if (!rfqData.rfqId) rfqData.rfqId = generateRfqId();

    // normalize date helpers
    const parseDateOrNull = (v: any) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };

    const openDateObj = parseDateOrNull(rfqData.openDateTime ?? rfqData.openDate ?? rfqData.open);
    const closeDateObj = parseDateOrNull(rfqData.closeDateTime ?? rfqData.closeDate ?? rfqData.closeTime) ?? new Date();
    const needByObj = parseDateOrNull(rfqData.needByDate ?? rfqData.need_by ?? rfqData.needByDateTime);
    const preferredDeliveryTime = rfqData.preferredDeliveryTime ?? null;

    // Normalize category array
    const customerCategoryNormalized = Array.isArray(rfqData.categoryIds)
      ? rfqData.categoryIds
      : Array.isArray(rfqData.customerCategory)
      ? rfqData.customerCategory
      : [];

    // -----------------------
    // NEW: Normalize suppliersSelected into objects and persist manual suppliers
    // -----------------------
    const rawSuppliersSelected = Array.isArray(rfqData.suppliersSelected) ? rfqData.suppliersSelected : [];
    // convert each to normalized object (or keep string)
    const normalizedSupplierObjects = rawSuppliersSelected
      .map((s: any) => normalizeSupplier(s))
      .filter(Boolean);

    // ensure supplier rows exist in DB and get supplier ids
    const { ids: supplierIdsFromDb, savedObjects } = await ensureSuppliersInDb(normalizedSupplierObjects);

    // We'll store suppliersSelected as the savedObjects (enriched DB-backed objects) so GET returns good shape
    const suppliersSelectedNormalized = savedObjects.length ? savedObjects : normalizedSupplierObjects;

    // suppliers (ids) array for FK lookups
    const suppliersIdArray = supplierIdsFromDb.length ? supplierIdsFromDb : normalizedSupplierObjects.map((s: any) => s.id?.toString?.() ?? s);

    // BRFQ numeric/string normalization
    const brCurrentPrice = (typeof rfqData.currentPrice !== "undefined" && rfqData.currentPrice !== null && rfqData.currentPrice !== "") ? String(rfqData.currentPrice) : null;
    const brTargetPrice  = (typeof rfqData.targetPrice  !== "undefined" && rfqData.targetPrice  !== null && rfqData.targetPrice  !== "") ? String(rfqData.targetPrice)  : null;
    const brPrValue      = (typeof rfqData.prValue      !== "undefined" && rfqData.prValue      !== null && rfqData.prValue      !== "") ? String(rfqData.prValue)      : null;

    // Approval logic
    const incomingApprovalStatus = rfqData.approvalStatus ?? (rfqData.status === "approval_pending" ? "pending" : rfqData.approvalStatus ?? "none");
    const approvalRequestedBy = rfqData.approvalRequestedBy ?? null;
    const approvalRequestedAt = rfqData.approvalRequestedAt ? parseDateOrNull(rfqData.approvalRequestedAt) : (rfqData.status === "approval_pending" ? new Date() : null);
    const approvedBy = rfqData.approvedBy ?? null;
    const approvedAt = rfqData.approvedAt ? parseDateOrNull(rfqData.approvedAt) : (incomingApprovalStatus === "approved" ? new Date() : null);
    const approvalNote = rfqData.approvalNote ?? null;

    // Items mapping -> RequestItem model
    const itemsPayload = Array.isArray(rfqData.items)
      ? rfqData.items.map((it: any, idx: number) => {
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

    // Check existing record & perform update/create
    const existing = await prisma.bRFQ.findUnique({ where: { rfqId: rfqData.rfqId } });

    if (existing) {
      const updated = await prisma.bRFQ.update({
        where: { id: existing.id },
        data: {
          title: rfqData.title ?? existing.title ?? "Untitled RFQ",
          openDate: openDateObj,
          closeDate: closeDateObj,
          closeTime: closeDateObj,
          needByDate: needByObj,
          preferredDeliveryTime: preferredDeliveryTime,
          requester: rfqData.requester ?? rfqData.requesterReference ?? existing.requester,
          shippingAddress: rfqData.shippingAddress ?? existing.shippingAddress,
          paymentProcess: rfqData.paymentProcess ?? existing.paymentProcess ?? "",
          currency: rfqData.currency ?? existing.currency ?? "",
          shippingType: rfqData.shippingType ?? existing.shippingType ?? null,
          carrier: rfqData.carrier ?? existing.carrier ?? null,
          urgency: rfqData.urgency ?? existing.urgency ?? null,
          notesToSupplier: rfqData.noteToSupplier ?? rfqData.noteToSupplier ?? existing.notesToSupplier ?? null,
          incoterms: rfqData.incoterms ?? existing.incoterms ?? null,
          origin: rfqData.origin ?? existing.origin ?? null,
          currentPrice: brCurrentPrice ?? existing.currentPrice ?? null,
          targetPrice: brTargetPrice ?? existing.targetPrice ?? null,
          prValue: brPrValue ?? existing.prValue ?? null,
          productSpecification: rfqData.productSpecification ?? existing.productSpecification ?? null,
          customerCategory: customerCategoryNormalized,
          // <-- Use the normalized supplier objects for suppliersSelected and supplier ids for suppliers
          suppliersSelected: suppliersSelectedNormalized,
          suppliers: suppliersIdArray,
          status: rfqData.status ?? existing.status ?? "draft",
          publishOnApproval: !!rfqData.publishOnApproval,
          approvalStatus: incomingApprovalStatus ?? existing.approvalStatus,
          approvalRequestedBy: approvalRequestedBy ?? existing.approvalRequestedBy,
          approvalRequestedAt: approvalRequestedAt ?? existing.approvalRequestedAt,
          approvedBy: approvedBy ?? existing.approvedBy,
          approvedAt: approvedAt ?? existing.approvedAt,
          approvalNote: approvalNote ?? existing.approvalNote,
          published: (incomingApprovalStatus === "approved") ? true : (typeof rfqData.published !== "undefined" ? !!rfqData.published : existing.published),
          attachmentPath: attachments.length ? JSON.stringify(attachments) : (existing.attachmentPath ?? null),

          // replace items
          items: {
            deleteMany: {},
            create: itemsPayload,
          },
        },
        include: { items: true },
      });

      return NextResponse.json({ success: true, data: updated }, { status: 200, headers: corsHeaders });
    } else {
      // create
      const created = await prisma.bRFQ.create({
        data: {
          rfqId: rfqData.rfqId,
          title: rfqData.title ?? "Untitled RFQ",
          openDate: openDateObj,
          closeDate: closeDateObj,
          closeTime: closeDateObj,
          needByDate: needByObj,
          preferredDeliveryTime: preferredDeliveryTime,
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
          suppliers: suppliersIdArray,
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
          items: {
            create: itemsPayload,
          },
        },
        include: { items: true },
      });

      return NextResponse.json({ success: true, data: created }, { status: 201, headers: corsHeaders });
    }
  } catch (err: any) {
    console.error("BRFQ draft save error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error saving BRFQ draft" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": "true" } }
    );
  }
}
