// /app/api/supplier-registration/load/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toISOStringOrNull(d: Date | string | null | undefined) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email parameter is missing." }, { status: 400 });
    }

    // 1) Try load supplier (may be null)
    const supplierData = await prisma.supplier.findUnique({
      where: { registrationEmail: email },
      include: {
        contacts: true,
        addresses: true,
        businessDocuments: true,
        bankAccounts: true,
        productCategories: true,
        questionnaireResponse: true,
      },
    });

    // If supplier exists and has already submitted final form, route to success page.
    if (supplierData && supplierData.registrationStatus === "FORM_SUBMITTED") {
      const ref = supplierData.registrationReference ?? "";
      const submittedAt = toISOStringOrNull(supplierData.registrationSubmittedAt);

      // build redirect path with query params (if present)
      const qp: string[] = [];
      if (ref) qp.push(`ref=${encodeURIComponent(ref)}`);
      if (submittedAt) qp.push(`submittedAt=${encodeURIComponent(submittedAt)}`);
      const redirectPath = `/supplier-registration/success${qp.length ? `?${qp.join("&")}` : ""}`;

      // detect top-level navigation vs XHR/fetch:
      const secFetchMode = req.headers.get("sec-fetch-mode") ?? "";
      const acceptHeader = req.headers.get("accept") ?? "";
      const isNavigation = secFetchMode === "navigate" || acceptHeader.includes("text/html");

      if (isNavigation) {
        // issue a real redirect (browser will navigate)
        return NextResponse.redirect(new URL(redirectPath, req.url));
      } else {
        // caller is likely an AJAX fetch — return JSON instructing frontend to redirect
        return NextResponse.json(
          {
            redirectTo: redirectPath,
            message: "Supplier already submitted — redirect to success page.",
            registrationReference: ref || null,
            registrationSubmittedAt: submittedAt || null,
          },
          { status: 200 }
        );
      }
    }

    // 2) Load active questionnaire templates/questions (flatten)
    const activeTemplates = await prisma.questionnaireTemplate.findMany({
      where: { isActive: true },
      include: {
        questions: {
          include: { category: true },
          orderBy: { order: "asc" },
        },
        category: true,
      },
    });

    // Flatten questions and map to client-friendly shape
    const questions: any[] = [];
    for (const t of activeTemplates) {
      for (const q of t.questions || []) {
        questions.push({
          id: q.id,
          text: q.text,
          description: q.description ?? null,
          type: q.type ?? "text",
          required: !!q.required,
          options: q.options ?? null,
          validation: q.validation ?? null,
          section: q.category?.name ?? t.name ?? "General",
          templateId: t.id,
          parentQuestionId: q.parentQuestionId ?? null,
        });
      }
    }

    // 3) Load any saved answers for this supplier (if supplier exists)
    let questionnaireAnswersMap: Record<string, any> = {};
    if (supplierData) {
      const answers = await prisma.questionnaireAnswer.findMany({
        where: { supplierId: supplierData.id },
      });
      for (const a of answers) {
        questionnaireAnswersMap[a.questionId] = a.answer;
      }

      if (supplierData.questionnaireResponse) {
        const qr: any = supplierData.questionnaireResponse;
        questionnaireAnswersMap["__questionnaireResponse__"] = {
          hasQualityManagementSystem: !!qr.hasQualityManagementSystem,
          hasEnvironmentalCertification: !!qr.hasEnvironmentalCertification,
          hasHealthSafetyCertification: !!qr.hasHealthSafetyCertification,
          acceptsTermsAndConditions: !!qr.acceptsTermsAndConditions,
          hasBusinessLicense: !!qr.hasBusinessLicense,
          hasTaxCertificate: !!qr.hasTaxCertificate,
          hasInsuranceCertificate: !!qr.hasInsuranceCertificate,
          hasFoodSafetyCertificate: !!qr.hasFoodSafetyCertificate,
        };
      }
    }

    // 4) Build completedSteps (same logic as before)
    const completedSteps: number[] = [];
    if (supplierData) {
      if (supplierData.companyName && supplierData.companyName.trim() !== "") completedSteps.push(0);

      if (Array.isArray(supplierData.contacts) && supplierData.contacts.length > 0) {
        const hasValidContact = supplierData.contacts.some((c: any) => c.email && c.email.trim() !== "");
        if (hasValidContact) completedSteps.push(1);
      }

      if (Array.isArray(supplierData.addresses) && supplierData.addresses.length > 0) {
        const hasAddr = supplierData.addresses.some((a: any) => (a.line1 && a.line1.trim() !== "") || (a.city && a.city.trim() !== ""));
        if (hasAddr) completedSteps.push(2);
      }

      if (Array.isArray(supplierData.businessDocuments) && supplierData.businessDocuments.length > 0) {
        const hasDoc = supplierData.businessDocuments.some((d: any) => (d.classification && d.classification.trim() !== "") || (d.certificateNumber && d.certificateNumber.trim() !== ""));
        if (hasDoc) completedSteps.push(3);
      }

      if (Array.isArray(supplierData.bankAccounts) && supplierData.bankAccounts.length > 0) {
        const hasBank = supplierData.bankAccounts.some((b: any) => b.bankName && b.accountNumber);
        if (hasBank) completedSteps.push(4);
      }

      const productCategoryIds: string[] = Array.isArray(supplierData.productCategories)
        ? supplierData.productCategories.map((pc: any) => String(pc.categoryId)).filter(Boolean)
        : [];
      if (productCategoryIds.length > 0) completedSteps.push(5);

      const hasQuestionnaireData = Boolean(
        supplierData.questionnaireResponse ||
        Object.keys(questionnaireAnswersMap).length > 0
      );
      if (hasQuestionnaireData) completedSteps.push(6);
    }

    const uniqueSortedCompleted = Array.from(new Set(completedSteps)).sort((a, b) => a - b);

    // 5) Format businessDocuments, contacts, addresses, bankAccounts for front-end
    const businessDocuments = (supplierData?.businessDocuments || []).map((doc: any) => ({
      id: doc.id,
      classification: doc.classification ?? "",
      subClassification: doc.subClassification ?? null,
      certifyingAgency: doc.certifyingAgency ?? null,
      otherCertifyingAgency: doc.otherCertifyingAgency ?? null,
      certificateNumber: doc.certificateNumber ?? null,
      certificateStartDate: toISOStringOrNull(doc.certificateStartDate),
      certificateEndDate: toISOStringOrNull(doc.certificateEndDate),
      notes: doc.notes ?? null,
      attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
      supplierId: doc.supplierId,
      createdAt: toISOStringOrNull(doc.createdAt),
      updatedAt: toISOStringOrNull(doc.updatedAt),
    }));

    const contacts = (supplierData?.contacts || []).map((c: any) => ({
      id: c.id,
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      email: c.email ?? "",
      designation: c.designation ?? "",
      country: c.countryCode ?? c.country ?? "",
      mobile: c.mobile ?? "",
      phone: c.phone ?? "",
      ext: c.ext ?? "",
      isAdministrativeContact: !!c.isAdministrativeContact,
      needsUserAccount: !!c.needsUserAccount,
    }));

    const addresses = (supplierData?.addresses || []).map((a: any) => ({
      id: a.id,
      type: a.type ?? "",
      line1: a.line1 ?? "",
      line2: a.line2 ?? null,
      line3: a.line3 ?? null,
      city: a.city ?? null,
      state: a.state ?? null,
      postalCode: a.postalCode ?? null,
      country: a.country ?? null,
      usage: a.usage ?? {},
      associatedContacts: Array.isArray(a.associatedContacts) ? a.associatedContacts : [],
    }));

    const bankAccounts = (supplierData?.bankAccounts || []).map((b: any) => {
      const holder = b.accountHolder ?? b.accountHolderName ?? "";
      return {
        id: b.id,
        country: b.country ?? null,
        bankName: b.bankName ?? "",
        bankBranch: b.bankBranch ?? null,
        accountNumber: b.accountNumber ?? "",
        accountHolderName: holder,
        accountHolder: holder,
        iban: b.iban ?? null,
        swiftCode: b.swiftCode ?? null,
        currency: b.currency ?? null,
        accountType: b.accountType ?? null,
        supplierId: b.supplierId,
        createdAt: toISOStringOrNull(b.createdAt),
        updatedAt: toISOStringOrNull(b.updatedAt),
      };
    });

    const productCategoryIds: string[] = Array.isArray(supplierData?.productCategories)
      ? supplierData.productCategories.map((pc: any) => String(pc.categoryId)).filter(Boolean)
      : [];

    // Build final response object
    const formattedData: any = {
  saved: Boolean(!!supplierData),
  verifiedEmail: email,
  companyDetails: {
    companyName: supplierData?.companyName ?? "",
    website: supplierData?.website ?? "",
    country: supplierData?.country ?? "",
    tradeLicenseNumber: supplierData?.tradeLicenseNumber ?? "",
    taxRegistrationNumber: supplierData?.taxRegistrationNumber ?? "",
    organizationType: supplierData?.organizationType ?? "",
    supplierType: supplierData?.supplierType ?? "",
    noteToApprover: supplierData?.noteToApprover ?? "",
    // ADD THIS LINE:
    profileAttachments: Array.isArray(supplierData?.profileAttachments) 
      ? supplierData.profileAttachments 
      : [],
    businessDocuments: businessDocuments.length > 0 ? businessDocuments : undefined,
  },
  contacts,
  addresses,
  businessDocuments,
  bankAccounts: bankAccounts.length > 0 ? bankAccounts : undefined,
  productsAndServices: productCategoryIds,
  questionnaire: questionnaireAnswersMap,
  questions,
  completedSteps: uniqueSortedCompleted,
};

    return NextResponse.json(formattedData, { status: 200 });
  } catch (err) {
    console.error("Failed to load progress:", err);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
