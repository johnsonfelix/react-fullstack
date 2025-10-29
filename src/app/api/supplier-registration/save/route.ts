// File: /src/app/api/supplier-registration/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { supplierRegistrationSchema } from "@/app/lib/zod-schemas/supplier-registration-schema";
import { merge } from "lodash";
import crypto from "crypto";

const prisma = new PrismaClient();

function normalizeArrayPatch(patchArray: any, existingArray: any[] = []) {
  if (!Array.isArray(patchArray)) return patchArray;
  const cleaned = patchArray.filter((it: any) => it != null);

  // If client explicitly sent empty array -> treat as clear
  if (cleaned.length === 0 && Array.isArray(patchArray)) {
    return [];
  }

  const hasId = cleaned.some((it: any) => it && typeof it === "object" && ("id" in it || "Id" in it));

  if (hasId) {
    const existingById: Record<string, any> = {};
    for (const e of existingArray || []) {
      if (!e) continue;
      const key = e.id ?? e.Id ?? null;
      if (key != null) existingById[String(key)] = e;
    }

    return cleaned.map((item: any) => {
      const key = item.id ?? item.Id ?? null;
      if (key != null && existingById[String(key)]) {
        return { ...existingById[String(key)], ...item };
      }
      return item;
    });
  }

  return cleaned;
}

function sanitizeAddressesForValidation(payload: any) {
  if (!payload || !Array.isArray(payload.addresses)) return;
  payload.addresses = payload.addresses.map((a: any) => {
    const usage = a?.usage ?? {};
    return {
      ...a,
      usage: {
        receivePurchaseOrders: !!usage.receivePurchaseOrders,
        receivePayments:        !!usage.receivePayments,
        bidOnRFQs:              !!usage.bidOnRFQs,
      },
      associatedContacts: Array.isArray(a?.associatedContacts)
                            ? a.associatedContacts.filter(Boolean)
                            : [],
    };
  });
}

function sanitizeBusinessDocumentsForValidation(payload: any) {
  if (!payload || !Array.isArray(payload.businessDocuments)) return;
  payload.businessDocuments = payload.businessDocuments.map((d: any) => {
    return {
      ...d,
      classification: d?.classification ?? "",
      subClassification: d?.subClassification ?? d?.subclassification ?? null,
      certifyingAgency: d?.certifyingAgency ?? null,
      otherCertifyingAgency: d?.otherCertifyingAgency ?? null,
      certificateNumber: d?.certificateNumber ?? null,
      certificateStartDate: d?.certificateStartDate ? new Date(d.certificateStartDate) : null,
      certificateEndDate: d?.certificateEndDate ? new Date(d.certificateEndDate) : null,
      notes: d?.notes ?? null,
      attachments: Array.isArray(d?.attachments) ? d.attachments.filter(Boolean).map(String) : [],
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { verifiedEmail, isFinalSubmit, ...formDataFromClient } = body;

    if (!verifiedEmail || typeof verifiedEmail !== "string") {
      return NextResponse.json({ error: "Verified email is required." }, { status: 400 });
    }

    const schemaToUse = isFinalSubmit
      ? supplierRegistrationSchema
      : supplierRegistrationSchema.deepPartial();

    sanitizeAddressesForValidation(formDataFromClient);
    sanitizeBusinessDocumentsForValidation(formDataFromClient);

    // Fetch existing supplier (for id-based merges)
    const existing = await prisma.supplier.findUnique({
      where: { registrationEmail: verifiedEmail },
      include: { contacts: true, addresses: true, bankAccounts: true, businessDocuments: true, productCategories: true },
    });

    if (Object.prototype.hasOwnProperty.call(formDataFromClient, "contacts")) {
      formDataFromClient.contacts = normalizeArrayPatch(formDataFromClient.contacts, existing?.contacts || []);
    }
    if (Object.prototype.hasOwnProperty.call(formDataFromClient, "addresses")) {
      formDataFromClient.addresses = normalizeArrayPatch(formDataFromClient.addresses, existing?.addresses || []);
    }
    if (Object.prototype.hasOwnProperty.call(formDataFromClient, "businessDocuments")) {
      formDataFromClient.businessDocuments = normalizeArrayPatch(formDataFromClient.businessDocuments, existing?.businessDocuments || []);
    }
    if (Object.prototype.hasOwnProperty.call(formDataFromClient, "bankAccounts")) {
      formDataFromClient.bankAccounts = normalizeArrayPatch(formDataFromClient.bankAccounts, existing?.bankAccounts || []);
    }

    // Normalize productsAndServices patch shape
    if (Object.prototype.hasOwnProperty.call(formDataFromClient, "productsAndServices")) {
      const existingCatObjs = Array.isArray(existing?.productCategories)
        ? existing.productCategories.map((pc: any) => ({ id: pc.categoryId }))
        : [];
      formDataFromClient.productsAndServices = normalizeArrayPatch(formDataFromClient.productsAndServices, existingCatObjs);
    }

    // Validate with zod
    const parsed = schemaToUse.safeParse({ verifiedEmail, ...formDataFromClient });

    if (!parsed.success) {
      console.error("Validation failed:", parsed.error.format());
      return NextResponse.json(
        {
          error: isFinalSubmit ? "Submission failed. Please ensure all fields are complete." : "Invalid data format.",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    // Merge client data with existing but treat array fields as replacements
    let finalData: any = merge({}, existing || {}, parsed.data);
    const arrayFields = ["contacts", "addresses", "businessDocuments", "bankAccounts", "productsAndServices"];
    for (const f of arrayFields) {
      if (Object.prototype.hasOwnProperty.call(parsed.data, f)) {
        finalData[f] = parsed.data[f];
      }
    }

    // Transaction: upsert supplier, clear child arrays, create new child rows, optionally set final submit fields
    const savedSupplier = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.upsert({
        where: { registrationEmail: verifiedEmail },
        update: {
          companyName: parsed.data.companyDetails?.companyName ?? existing?.companyName,
          website: parsed.data.companyDetails?.website ?? existing?.website,
          country: parsed.data.companyDetails?.country ?? existing?.country,
          organizationType: parsed.data.companyDetails?.organizationType ?? existing?.organizationType,
          supplierType: parsed.data.companyDetails?.supplierType ?? existing?.supplierType,
          tradeLicenseNumber: parsed.data.companyDetails?.tradeLicenseNumber ?? existing?.tradeLicenseNumber,
          taxRegistrationNumber: parsed.data.companyDetails?.taxRegistrationNumber ?? existing?.taxRegistrationNumber,
          noteToApprover: parsed.data.companyDetails?.noteToApprover ?? existing?.noteToApprover,
        },
        create: {
          registrationEmail: verifiedEmail,
          companyName: parsed.data.companyDetails?.companyName ?? existing?.companyName ?? "",
          website: parsed.data.companyDetails?.website ?? existing?.website ?? null,
          country: parsed.data.companyDetails?.country ?? existing?.country ?? "",
          organizationType: parsed.data.companyDetails?.organizationType ?? existing?.organizationType ?? null,
          supplierType: parsed.data.companyDetails?.supplierType ?? existing?.supplierType ?? null,
          tradeLicenseNumber: parsed.data.companyDetails?.tradeLicenseNumber ?? existing?.tradeLicenseNumber ?? null,
          taxRegistrationNumber: parsed.data.companyDetails?.taxRegistrationNumber ?? existing?.taxRegistrationNumber ?? null,
          noteToApprover: parsed.data.companyDetails?.noteToApprover ?? existing?.noteToApprover ?? null,
        },
      });

      // Clear old child rows (businessDocument, address, bankAccount, contact) and supplierCategory join rows
      await tx.businessDocument.deleteMany({ where: { supplierId: supplier.id } });
      await tx.address.deleteMany({ where: { supplierId: supplier.id } });
      await tx.bankAccount.deleteMany({ where: { supplierId: supplier.id } });
      await tx.contact.deleteMany({ where: { supplierId: supplier.id } });
      await tx.supplierCategory.deleteMany({ where: { supplierId: supplier.id } });

      // Create business documents
      const createdBusinessDocuments: any[] = [];
      if (Array.isArray(finalData.businessDocuments) && finalData.businessDocuments.length > 0) {
        for (const bd of finalData.businessDocuments) {
          const createInput = {
            supplierId: supplier.id,
            classification: (bd.classification ?? "").toString(),
            subClassification: bd.subClassification ?? bd.subclassification ?? null,
            certifyingAgency: bd.certifyingAgency ?? null,
            otherCertifyingAgency: bd.otherCertifyingAgency ?? null,
            notes: bd.notes ?? null,
            certificateNumber: bd.certificateNumber ?? null,
            certificateStartDate: bd.certificateStartDate ? new Date(bd.certificateStartDate) : null,
            certificateEndDate: bd.certificateEndDate ? new Date(bd.certificateEndDate) : null,
            attachments: Array.isArray(bd.attachments) ? bd.attachments.map(String) : [],
          };

          const isEmpty =
            !createInput.classification &&
            !createInput.certificateNumber &&
            !createInput.certificateStartDate &&
            !createInput.certificateEndDate &&
            (!createInput.attachments || createInput.attachments.length === 0);

          if (isEmpty) continue;

          const created = await tx.businessDocument.create({ data: createInput });
          createdBusinessDocuments.push(created);
        }
      }
      finalData.businessDocuments = createdBusinessDocuments;

      // Create addresses
      const createdAddresses: any[] = [];
      if (Array.isArray(finalData.addresses) && finalData.addresses.length > 0) {
        for (const a of finalData.addresses) {
          const line1Val = (a.line1 ?? "").toString().trim();
          const line2Val = (a.line2 ?? a.line2 ?? "").toString().trim();
          const line3Val = (a.line3 ?? "").toString().trim();

          const createInput = {
            supplierId: supplier.id,
            type: (a.type && String(a.type).trim()) || "",
            line1: line1Val || "",
            line2: line2Val || "",
            line3: line3Val || "",
            city: (a.city && String(a.city).trim()) || "",
            state: (a.state && String(a.state).trim()) || "",
            postalCode: (a.postalCode && String(a.postalCode).trim()) || "",
            country: (a.country && String(a.country).trim()) || "IN",
            usage: a.usage ?? {},
            associatedContacts: Array.isArray(a?.associatedContacts) ? a.associatedContacts : [],
          };

          if (!createInput.line1 && !createInput.city && !createInput.postalCode && !createInput.type) {
            continue;
          }

          const created = await tx.address.create({ data: createInput });
          createdAddresses.push(created);
        }
      }
      finalData.addresses = createdAddresses;

      // Create bank accounts
      const createdBankAccounts: any[] = [];
      if (Array.isArray(finalData.bankAccounts) && finalData.bankAccounts.length > 0) {
        for (const ba of finalData.bankAccounts) {
          const holderName = ba?.accountHolderName ?? ba?.accountHolder ?? "";

          if (!ba.bankName && !ba.accountNumber && !holderName) continue;

          const createInput = {
            supplierId: supplier.id,
            country: ba.country ?? "IN",
            currency: ba.currency ?? "",
            accountType: ba.accountType ?? "",
            bankName: ba.bankName ?? "",
            accountNumber: ba.accountNumber ?? "",
            accountHolder: holderName,
            bankBranch: ba.bankBranch ?? "",
            iban: ba.iban ?? "",
            swiftCode: ba.swiftCode ?? "",
          };

          const created = await tx.bankAccount.create({ data: createInput });
          createdBankAccounts.push(created);
        }
      }
      finalData.bankAccounts = createdBankAccounts;

      // Create contacts (NEW)
     const createdContacts: any[] = [];
if (Array.isArray(finalData.contacts) && finalData.contacts.length > 0) {
  for (const c of finalData.contacts) {
    const dataForCreate = {
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      email: c.email ?? "",
      designation: c.designation ?? null,
      countryCode: c.country ?? c.countryCode ?? "IN",
      mobile: c.mobile ?? null,
      phone: c.phone ?? null,
      ext: c.ext ?? null,
      isAdministrativeContact: !!c.isAdministrativeContact,
      needsUserAccount: !!c.needsUserAccount,
      // Connect the supplier relation instead of relying on a scalar supplierId
      supplier: { connect: { id: supplier.id } },
    };

    // Skip obviously empty contact entries
    const isEmptyContact = !dataForCreate.email && !dataForCreate.firstName && !dataForCreate.mobile;
    if (isEmptyContact) continue;

    const created = await tx.contact.create({ data: dataForCreate });
    createdContacts.push(created);
  }
}
finalData.contacts = createdContacts;

      // Normalize productsAndServices to array of strings
      if (Array.isArray(finalData.productsAndServices)) {
        finalData.productsAndServices = finalData.productsAndServices
          .map((p: any) => {
            if (p == null) return null;
            if (typeof p === "string" || typeof p === "number") return String(p);
            if (typeof p === "object") {
              return String(p.id ?? p.Id ?? p.categoryId ?? p.category ?? (p.id?.toString?.() ? p.id : null) ?? null);
            }
            return null;
          })
          .filter(Boolean);
      }

      // Questionnaire answers + response (merge)
      if (parsed.data.questionnaire && typeof parsed.data.questionnaire === "object") {
        const qObj: Record<string, any> = { ...parsed.data.questionnaire };
        delete qObj.completedSections;

        const questionEntries = Object.entries(qObj).filter(([k]) => k && k !== "undefined");

        if (questionEntries.length > 0) {
          const existingAnswers = await tx.questionnaireAnswer.findMany({
            where: { supplierId: supplier.id },
          });

          const existingMap = new Map<string, { id: string; questionId: string; answer: any }>();
          for (const a of existingAnswers) {
            if (a && a.questionId != null) existingMap.set(String(a.questionId), a as any);
          }

          const upsertedAnswers: any[] = [];
          for (const [questionId, answerValue] of questionEntries) {
            if (!questionId || questionId === "verifiedEmail") continue;

            const shouldSave =
              answerValue !== undefined &&
              answerValue !== null &&
              !(typeof answerValue === "string" && answerValue.trim() === "");

            if (!shouldSave) {
              continue;
            }

            if (existingMap.has(String(questionId))) {
              const existing = existingMap.get(String(questionId))!;
              const updated = await tx.questionnaireAnswer.update({
                where: { id: existing.id },
                data: { answer: answerValue },
              });
              upsertedAnswers.push(updated);
            } else {
              // --- SAFETY: ensure question exists before creating the answer to avoid FK violation ---
              const questionRecord = await tx.questionnaireQuestion.findUnique({
                where: { id: String(questionId) },
                select: { id: true },
              });

              if (!questionRecord) {
                // skip answers for unknown question ids (prevents foreign key constraint violation)
                console.warn("Skipping answer creation — unknown questionId:", questionId);
                continue;
              }

              const created = await tx.questionnaireAnswer.create({
                data: {
                  questionId: String(questionId),
                  supplierId: supplier.id,
                  answer: answerValue,
                },
              });
              upsertedAnswers.push(created);
            }
          }

          finalData.questionnaireAnswers = upsertedAnswers;
        }

        const responseFields = [
          "hasQualityManagementSystem",
          "hasEnvironmentalCertification",
          "hasHealthSafetyCertification",
          "acceptsTermsAndConditions",
          "hasBusinessLicense",
          "hasTaxCertificate",
          "hasInsuranceCertificate",
          "hasFoodSafetyCertificate",
          "hasHalalCertificate",
          "hasOrganicCertificate",
          "additionalNotes",
        ];
        const qrPayload: Record<string, any> = {};
        for (const k of responseFields) {
          if (Object.prototype.hasOwnProperty.call(parsed.data.questionnaire, k)) {
            qrPayload[k] = parsed.data.questionnaire[k];
          }
        }

        if (Object.keys(qrPayload).length > 0) {
          await tx.questionnaireResponse.upsert({
            where: { supplierId: supplier.id },
            update: qrPayload,
            create: { supplierId: supplier.id, ...qrPayload },
          });
          finalData.questionnaireResponse = qrPayload;
        }
      }

      // Create supplierCategory join rows
      const createdSupplierCategories: any[] = [];
      if (Array.isArray(finalData.productsAndServices) && finalData.productsAndServices.length > 0) {
        for (const catId of finalData.productsAndServices) {
          if (!catId) continue;
          const pc = await tx.productCategory.findUnique({ where: { id: String(catId) } });
          if (!pc) {
            console.warn("Skipping unknown product category id:", catId);
            continue;
          }
          try {
            const created = await tx.supplierCategory.create({
              data: {
                supplierId: supplier.id,
                categoryId: String(catId),
              },
            });
            createdSupplierCategories.push(created);
          } catch (err) {
            console.warn("Failed to create supplierCategory for id:", catId, err);
          }
        }
      }
      finalData.productCategories = createdSupplierCategories;

      // FINAL SUBMIT: set registration status & friendly reference if requested
      if (isFinalSubmit) {
        const timestampPart = Date.now().toString(36).toUpperCase();
        const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
        const displayRef = `SR-${timestampPart}-${randomPart}`;

        // update supplier with registration fields
        await tx.supplier.update({
          where: { id: supplier.id },
          data: {
            registrationStatus: "FORM_SUBMITTED",
            registrationReference: displayRef,
            registrationSubmittedAt: new Date(),
            submittedAt: new Date(),
          },
        });

        // attach to finalData so the response contains it
        finalData.registrationReference = displayRef;
        finalData.registrationStatus = "FORM_SUBMITTED";
        finalData.registrationSubmittedAt = new Date().toISOString();
      }

      // Fetch the final supplier record (includes the updated registrationReference/SubmittedAt if final submitted)
      const finalSupplier = await tx.supplier.findUnique({
        where: { registrationEmail: verifiedEmail },
      });

      // return both final supplier and the assembled finalData
      return { finalSupplier, finalData };
    });

    // destructure the returned object and avoid redeclaring `finalData`
    const { finalSupplier, finalData: persistedFinalData } = savedSupplier;

    const message = isFinalSubmit ? "Registration submitted successfully!" : "Progress saved successfully!";

    const responseReference = persistedFinalData?.registrationReference ?? finalSupplier?.registrationReference ?? null;
    const registrationSubmittedAt = persistedFinalData?.registrationSubmittedAt ?? finalSupplier?.registrationSubmittedAt ?? null;

    return NextResponse.json({
      message,
      supplierId: finalSupplier?.id ?? null,
      savedData: persistedFinalData,
      registrationReference: responseReference,
      registrationSubmittedAt: registrationSubmittedAt,
    }, { status: 200 });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
