// /app/supplier-registration/_components/multi-step-form.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { get, set, merge } from "lodash";
import { useRouter } from "next/navigation";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import { CheckCircle, Circle } from "lucide-react";

import CompanyDetailsStep from "./company-details-step";
import ContactsStep from "./contacts-step";
import AddressesStep from "./addresses-step";
import BusinessDocumentsStep from "./business-documents-step";
import BankAccountsStep from "./bank-accounts-step";
import ProductsServicesStep from "./products-services-step";
import QuestionnaireStep from "./questionnaire-step";

import type { FieldPath } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  supplierRegistrationSchema,
  SupplierRegistrationFormValues,
} from "@/app/lib/zod-schemas/supplier-registration-schema";

type FormValues = z.infer<typeof supplierRegistrationSchema>;

const steps = [
  { id: "Company Details", component: CompanyDetailsStep },
  { id: "Contacts", component: ContactsStep },
  { id: "Addresses", component: AddressesStep },
  { id: "Business Document", component: BusinessDocumentsStep },
  { id: "Bank Accounts", component: BankAccountsStep },
  { id: "Products & Services", component: ProductsServicesStep },
  { id: "Questionnaire", component: QuestionnaireStep },
];

interface MultiStepFormProps {
  verifiedEmail: string | null;
}

export default function MultiStepForm({ verifiedEmail }: MultiStepFormProps) {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues: FormValues = {
    verifiedEmail: verifiedEmail || "",
    companyDetails: {
      companyName: "",
      website: "",
      country: "",
      tradeLicenseNumber: "",
      taxRegistrationNumber: "",
      organizationType: "",
      supplierType: "",
      noteToApprover: "",
      attachmentUrl: "",
      businessDocuments: [],
    },
    contacts: [
      {
        firstName: "",
        lastName: "",
        email: verifiedEmail || "",
        designation: "",
        country: "IN",
        mobile: "",
        phone: "",
        ext: "",
        isAdministrativeContact: false,
        needsUserAccount: false,
      },
    ],
    addresses: [
      {
        type: "",
        line1: "",
        line2: "",
        line3: "",
        city: "",
        state: "",
        postalCode: "",
        country: "IN",
      },
    ],
    businessDocuments: [],
    bankAccounts: [],
    productsAndServices: [],
    questionnaire: { question1: false, question2: "na" } as any,
  } as FormValues;

  const methods = useForm<SupplierRegistrationFormValues>({
    resolver: zodResolver(supplierRegistrationSchema) as unknown as Resolver<SupplierRegistrationFormValues>,
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const {
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, dirtyFields },
    reset,
    setValue,
  } = methods;

  const stepValidationFields: string[][] = [
    ["companyDetails.companyName", "companyDetails.organizationType"],
    ["contacts", "contacts.0.firstName", "contacts.0.email"],
    ["addresses", "addresses.0.country"],
    ["businessDocuments"],
    ["bankAccounts"],
    ["productsAndServices"],
    ["questionnaire.question1", "questionnaire.question2"],
  ];

  const getDirtyValues = (dirtyObj: any, allValues: FormValues) => {
    const result: any = {};
    const walk = (obj: any, prefix = "") => {
      if (!obj || typeof obj !== "object") return;
      Object.keys(obj).forEach((key) => {
        const val = obj[key];
        const path = prefix ? `${prefix}.${key}` : key;
        if (val === true) {
          set(result, path, get(allValues, path));
        } else if (typeof val === "object") {
          walk(val, path);
        }
      });
    };
    walk(dirtyObj);
    return result;
  };

  // Load saved progress
  useEffect(() => {
    if (!verifiedEmail) {
      setIsLoading(false);
      return;
    }

    const loadProgress = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/supplier-registration/load?email=${encodeURIComponent(verifiedEmail)}`);
        if (!res.ok) {
          throw new Error(`Failed to load data. Status: ${res.status}`);
        }

        const savedData = await res.json();

        // If backend instructs client to redirect (supplier already final-submitted)
        if (savedData?.redirectTo) {
          // navigate client-side to the success page
          router.push(savedData.redirectTo);
          return;
        }

        if (!savedData) {
          setValue("verifiedEmail", verifiedEmail);
          setValue("contacts.0.email", verifiedEmail);
          setIsLoading(false);
          return;
        }

        const merged = merge({}, initialValues, savedData) as FormValues;
        if (verifiedEmail) merged.verifiedEmail = verifiedEmail;
        if (verifiedEmail && (!merged.contacts || merged.contacts.length === 0)) {
          merged.contacts = initialValues.contacts;
        }
        merged.contacts[0].email = verifiedEmail;

        reset(merged);

        let loadedCompleted: number[] = [];
        if (Array.isArray((savedData as any).completedSteps)) {
          loadedCompleted = (savedData as any).completedSteps.filter((n: any) => typeof n === "number");
        }

        loadedCompleted = Array.from(new Set(loadedCompleted)).sort((a, b) => a - b);
        setCompletedSteps(loadedCompleted);

        const firstIncomplete = steps.findIndex((_, idx) => !loadedCompleted.includes(idx));
        setCurrentStep(firstIncomplete === -1 ? steps.length - 1 : firstIncomplete);
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedEmail, reset, setValue, router]);

  // FINAL SUBMIT
  const onFinalSubmit = async (data: FormValues) => {
    try {
      const ok = await trigger();
      if (!ok) {
        alert("Please fix validation errors before submitting.");
        return;
      }

      setIsSubmitting(true);

      const res = await fetch("/api/supplier-registration/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          verifiedEmail: data.verifiedEmail || verifiedEmail,
          isFinalSubmit: true,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Submission failed.");

      const ref = result.registrationReference ?? result.savedData?.registrationReference ?? null;
      const submittedAt = result.registrationSubmittedAt ?? result.savedData?.registrationSubmittedAt ?? null;

      if (ref) {
        router.push(`/supplier-registration/success?ref=${encodeURIComponent(ref)}${submittedAt ? `&submittedAt=${encodeURIComponent(submittedAt)}` : ""}`);
      } else {
        alert(result.message || "Submitted successfully");
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // SAVE PROGRESS
 // Replace existing handleSaveProgress with this function inside MultiStepForm
const handleSaveProgress = async () => {
  const allValues = getValues();
  const dirtyData = getDirtyValues(dirtyFields as any, allValues);

  // define which top-level keys are allowed to be saved for each step index
  // step index corresponds to your `steps` array
  const allowedByStep: string[][] = [
    ["companyDetails"], // step 0 -> only company details
    ["companyDetails", "contacts"], // step 1 -> company + contacts
    ["companyDetails", "contacts", "addresses"], // step 2
    ["companyDetails", "contacts", "addresses", "businessDocuments"], // step 3
    ["companyDetails", "contacts", "addresses", "businessDocuments", "bankAccounts"], // step 4
    ["companyDetails", "contacts", "addresses", "businessDocuments", "bankAccounts", "productsAndServices"], // step 5
    ["companyDetails", "contacts", "addresses", "businessDocuments", "bankAccounts", "productsAndServices", "questionnaire"], // step 6
  ];

  const allowed = allowedByStep[currentStep] ?? allowedByStep[allowedByStep.length - 1];

  // Helper: pick only allowed keys from an object
  const pickAllowed = (src: Record<string, any>) => {
    const out: Record<string, any> = {};
    for (const k of Object.keys(src)) {
      if (allowed.includes(k)) out[k] = src[k];
    }
    return out;
  };

  // If dirtyData contains things, filter them down to allowed keys only
  let payloadBody: Record<string, any> = {};
  if (Object.keys(dirtyData).length > 0) {
    payloadBody = pickAllowed(dirtyData);

    // If arrays are expected but not present in dirtyData and they exist in allValues,
    // include them only if they are allowed for the current step (keeps previous behaviour)
    const arrayFields = ["contacts", "addresses", "businessDocuments", "bankAccounts", "productsAndServices"];
    for (const arrField of arrayFields) {
      if (allowed.includes(arrField) && !(arrField in payloadBody) && Array.isArray(allValues[arrField]) && allValues[arrField].length > 0) {
        // include full array only if it belongs to allowed set
        payloadBody[arrField] = allValues[arrField];
      }
    }
  } else {
    // No explicit dirty keys -> do NOT send entire form.
    // Instead send only the allowed subset from allValues (so step 0 won't send contacts)
    for (const key of allowed) {
      if (allValues[key] !== undefined) payloadBody[key] = allValues[key];
    }
  }

  // If after filtering there's nothing to save, skip the network call
  if (Object.keys(payloadBody).length === 0) {
    alert("Nothing to save for this step.");
    return;
  }

  // Always include verifiedEmail and tell server this is not the final submit
  const payload = {
    ...payloadBody,
    verifiedEmail,
    isFinalSubmit: false,
  };

  try {
    setIsSubmitting(true);
    const res = await fetch("/api/supplier-registration/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to save progress.");
    alert(result.message || "Progress saved");
    // Reset form dirty state to current values
    reset(getValues());
    if (result.savedData?.completedSteps) setCompletedSteps(result.savedData.completedSteps);
  } catch (err: any) {
    alert(`Save failed: ${err.message}`);
    console.error("Save error details:", err);
  } finally {
    setIsSubmitting(false);
  }
};

  const handleNext = async () => {
    const fieldsToValidate = stepValidationFields[currentStep] || [];
    const valid = fieldsToValidate.length > 0
      ? await trigger(fieldsToValidate as unknown as FieldPath<FormValues>[])
      : await trigger();
    if (!valid) return;
    if (currentStep < steps.length - 1) {
      setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => currentStep > 0 && setCurrentStep((prev) => prev - 1);
  const StepComponent = steps[currentStep].component;
  const progressValue = Math.round(((currentStep + 1) / steps.length) * 100);

  // programmatic submit handler
  const submitRegistration = async () => {
    setIsSubmitting(true);
    try {
      await handleSubmit(
        async (data) => {
          await onFinalSubmit(data);
        },
        (errors) => {
          console.log("handleSubmit validation errors:", errors);
          alert("Validation failed. Please check the form for errors.");
        }
      )();
    } catch (err) {
      console.error("submitRegistration error:", err);
      alert(`Unexpected error: ${err?.message ?? err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div>Loading form...</div>;

  return (
    <>
      <Card className="w-full max-w-6xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Supplier Onboarding Portal
          </CardTitle>
          <Progress value={progressValue} className="w-full mt-4" />
        </CardHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onFinalSubmit)}>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-1/4">
                  <nav className="flex flex-col space-y-2">
                    {steps.map((step, index) => (
                      <button
                        key={step.id}
                        type="button"
                        disabled={!completedSteps.includes(index) && index > currentStep}
                        onClick={() => setCurrentStep(index)}
                        className={`flex items-center space-x-3 p-3 text-left rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          currentStep === index
                            ? "bg-primary text-primary-foreground shadow-md"
                            : completedSteps.includes(index)
                            ? "bg-green-50 text-green-800 hover:bg-green-100"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {completedSteps.includes(index) ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle
                            className={`h-5 w-5 ${currentStep === index ? "text-white" : "text-gray-400"}`}
                          />
                        )}
                        <span className="font-medium">{step.id}</span>
                      </button>
                    ))}
                  </nav>
                </aside>

                <main className="w-full md:w-3/4">
                  <div className="min-h-[400px]">
                    <StepComponent />
                  </div>
                </main>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-6">
              <div>
                {currentStep > 0 && (
                  <Button variant="outline" type="button" onClick={handlePrev} disabled={isSubmitting}>
                    Go Back
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                {currentStep < steps.length - 1 ? (
                  <>
                    <Button type="button" variant="secondary" onClick={handleSaveProgress} disabled={isSubmitting}>
                      Save Progress
                    </Button>
                    <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                      Continue
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="secondary" onClick={handleSaveProgress} disabled={isSubmitting}>
                      Save Progress
                    </Button>
                    <Button
                      type="button"
                      className={`bg-green-600 hover:bg-green-700 ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                      onClick={submitRegistration}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Registration"}
                    </Button>
                  </>
                )}
              </div>
            </CardFooter>
          </form>
        </FormProvider>
      </Card>
    </>
  );
}
