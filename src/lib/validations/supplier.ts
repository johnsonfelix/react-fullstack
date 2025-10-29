import { z } from 'zod';

export const companyDetailsSchema = z.object({
  companyName: z.string().min(1, 'Company Name is required (use capital letters as per trade license)'),
  website: z.string().url().optional().or(z.literal('')),
  country: z.string().min(1, 'Country is required'),
  tradeLicenseNumber: z.string().optional(),
  taxRegistrationNumber: z.string().optional(),
  organizationType: z.string().min(1, 'Organization Type is required'),
  supplierType: z.string().min(1, 'Supplier Type is required'),
  noteToApprover: z.string().optional(),
  profileAttachments: z.array(z.string()).optional(),
  registrationEmail: z.string().email(),
});

export const contactSchema = z.object({
  firstName: z.string().min(1, 'First Name is required'),
  lastName: z.string().min(1, 'Last Name is required'),
  email: z.string().email('Valid email is required'),
  designation: z.string().optional(),
  countryCode: z.string().min(1, 'Country code is required'),
  mobile: z.string().min(1, 'Mobile number is required'),
  phone: z.string().optional(),
  ext: z.string().optional(),
  isAdministrativeContact: z.boolean().default(false),
  needsUserAccount: z.boolean().default(false),
});

export const addressSchema = z.object({
  type: z.enum(['Billing', 'Shipping']),
  line1: z.string().min(1, 'Address Line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal Code is required'),
  country: z.string().min(1, 'Country is required'),
});

export const businessDocumentSchema = z.object({
  classification: z.string().min(1, 'Classification is required'),
  subClassification: z.string().optional(),
  certifyingAgency: z.string().optional(),
  otherCertifyingAgency: z.string().optional(),
  certificateNumber: z.string().optional(),
  certificateStartDate: z.string().optional(),
  certificateEndDate: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

export const bankAccountSchema = z.object({
  country: z.string().min(1, 'Country is required'),
  currency: z.string().min(1, 'Currency is required'),
  accountType: z.string().min(1, 'Account Type is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  bankBranch: z.string().optional(),
  accountNumber: z.string().min(1, 'Account number is required'),
  accountHolder: z.string().min(1, 'Account holder name is required'),
});

export const questionnaireSchema = z.object({
  // Declarations
  hasReadSupplierCode: z.boolean(),
  hasNoConflictOfInterest: z.boolean(),
  
  // Minimum Required Documents
  isUAERegistered: z.boolean().optional(),
  hasBankAccountInfo: z.boolean().optional(),
  hasESGFeedback: z.boolean().optional(),
  
  // F&B Specific
  isFoodBeverageProvider: z.boolean().optional(),
  
  additionalNotes: z.string().optional(),
});

export type CompanyDetailsInput = z.infer<typeof companyDetailsSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type BusinessDocumentInput = z.infer<typeof businessDocumentSchema>;
export type BankAccountInput = z.infer<typeof bankAccountSchema>;
export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;
