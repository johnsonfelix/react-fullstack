import { z } from "zod";

// This preprocessor handles strings ("true", "false") and actual booleans.
const booleanFromString = z.preprocess((val) => {
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
  }
  return val; // Return original value if it's already a boolean or something else
}, z.boolean());


// Schema for a single contact
const contactSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().optional(),
  email: z.string().email({ message: "A valid email is required." }),
  designation: z.string().optional(),
  country: z.string().min(1, { message: "Country is required." }),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  ext: z.string().optional(),
  isAdministrativeContact: booleanFromString.default(false),
  needsUserAccount: booleanFromString.default(false),
});

// Schema for a single address
const addressSchema = z.object({
  type: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().nullable().optional(),
  line3: z.string().nullable().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),

  usage: z
    .object({
      receivePurchaseOrders: z.boolean().optional(),
      receivePayments: z.boolean().optional(),
      bidOnRFQs: z.boolean().optional(),
    })
    .optional(),

  associatedContacts: z.array(z.string()).optional(),
});

// Schema for a single business document
const dateFromString = z.preprocess((arg) => {
  if (!arg) return undefined;
  if (arg instanceof Date) return arg;
  const s = String(arg);
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}, z.date().optional());

const businessDocumentSchema = z.object({
  classification: z.string().optional().nullable(),
  subClassification: z.string().optional().nullable(), // server uses subClassification
  // also accept alternate camel-case client key if you use `subclassification`:
  subclassification: z.string().optional().nullable(),

  certifyingAgency: z.string().optional().nullable(),
  otherCertifyingAgency: z.string().optional().nullable(),

  certificateNumber: z.string().optional().nullable(),
  certificateStartDate: dateFromString,
  certificateEndDate: dateFromString,

  notes: z.string().optional().nullable(),

  // attachments: array of file URLs
  attachments: z.array(z.string()).optional().nullable(),
});

// Schema for a single bank account
const bankAccountSchema = z.preprocess((arg) => {
  if (arg && typeof arg === "object") {
    const a: any = { ...(arg as object as Record<string, any>) };
    // Accept either key and mirror to both keys so downstream code can rely on either one.
    if (a.accountHolder && !a.accountHolderName) a.accountHolderName = a.accountHolder;
    if (a.accountHolderName && !a.accountHolder) a.accountHolder = a.accountHolderName;
    return a;
  }
  return arg;
}, z.object({
  bankName: z.string().min(1, "Bank name is required."),
  bankBranch: z.string().optional(),
  accountHolderName: z.string().min(1, "Account holder name is required."),
  accountNumber: z.string().min(1, "Account number is required."),
  iban: z.string().optional(),
  swiftCode: z.string().optional(),
  currency: z.string().min(1, "Currency is required."),
  accountType: z.string().optional(),
  country: z.string().optional(),
  // NOTE: the DB may use `accountHolder` but we normalize it to both keys above
}));

// NOTE: productServiceSchema kept for reference if you later collect more info
const productServiceSchema = z.object({
  name: z.string().min(1, "Product/Service name is required."),
  description: z.string().optional(),
  category: z.string().optional(),
});

// Main Supplier Registration Schema
export const supplierRegistrationSchema = z.object({
  verifiedEmail: z.string().email({ message: "A valid verified email is required." }),

  companyDetails: z.object({
  companyName: z.string().min(1, { message: "Company name is required." }),
  website: z.union([z.string().url({ message: "Please enter a valid URL." }), z.literal("")]).optional(),
  country: z.string().min(1, { message: "Country is required." }), // keep required if you want
  organizationType: z.string().min(1, { message: "Organization type is required." }),
  supplierType: z.string().optional(),
  tradeLicenseNumber: z.string().optional(),
  taxRegistrationNumber: z.string().optional(),
  noteToApprover: z.string().optional(),
  businessDocuments: z.array(businessDocumentSchema).optional(),
  profileAttachments: z.array(z.string()).optional().default([]),
}),

  contacts: z.array(contactSchema).min(1, { message: "At least one contact is required." }),

  addresses: z.array(addressSchema).min(1, { message: "At least one address is required." }),

  businessDocuments: z.array(businessDocumentSchema).optional(),
  bankAccounts: z.array(bankAccountSchema).optional(),

  // <-- IMPORTANT: productsAndServices is now an array of category IDs (string[])
  productsAndServices: z.array(z.string()).optional(),

  questionnaire: z.object({
  question1: booleanFromString.default(false),
  question2: z.enum(["yes", "no", "na"], { required_error: "Please select an option." }),
  completedSections: z.array(z.string()).optional(),
})
.catchall(z.any())    // <-- allow arbitrary questionId keys and any values
.optional()
});

// Type export for use in components
export type SupplierRegistrationFormValues = z.infer<typeof supplierRegistrationSchema>;
