"use client";

import React, { useEffect } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Trash2 } from "lucide-react";

/**
 * BusinessDocumentsStep
 *
 * - Ensures at least one row is visible (appends blank row when empty)
 * - Marks "__businessDocumentsTouched" when user interacts so partial save includes the array
 *
 * Fix: normalize ISO date strings to YYYY-MM-DD so <input type="date"> can display them
 */
export default function BusinessDocumentsStep() {
  // get form helpers from context
  const { control, register, setValue, watch } = useFormContext();

  // useFieldArray provides fields, append, remove for the named array
  const { fields, append, remove } = useFieldArray({
    control,
    name: "businessDocuments" as const,
  });

  // default blank document (matches your Zod schema)
  const emptyDoc = {
    classification: "",
    subClassification: "",
    certifyingAgency: "",
    otherCertifyingAgency: "",
    certificateNumber: "",
    certificateStartDate: "",
    certificateEndDate: "",
    notes: "",
    attachments: [],
  };

  // helper: convert ISO datetime string to yyyy-mm-dd for <input type="date">
  const isoToDateInput = (iso?: string | null) => {
    if (!iso) return "";
    // if already in yyyy-mm-dd format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    // if ISO like 2025-10-22T00:00:00.000Z slice first 10 chars
    if (typeof iso === "string" && iso.includes("T")) {
      return iso.slice(0, 10);
    }
    return "";
  };

  // Ensure there's always at least one visible row (mount + after resets)
  useEffect(() => {
    if (fields.length === 0) {
      append(emptyDoc);
      // do not mark touched for auto-append (user didn't explicitly edit)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length]);

  // normalize ISO date strings from loaded data into yyyy-mm-dd so <input type="date"> shows them
  useEffect(() => {
    fields.forEach((field, index) => {
      const startIso = (field as any).certificateStartDate;
      const endIso = (field as any).certificateEndDate;

      // only setValue if the input currently differs to avoid unnecessary updates
      const currentStart = watch(`businessDocuments.${index}.certificateStartDate`);
      const formattedStart = isoToDateInput(startIso);
      if (formattedStart && currentStart !== formattedStart) {
        setValue(`businessDocuments.${index}.certificateStartDate`, formattedStart, {
          shouldDirty: false,
          shouldTouch: false,
        });
      }

      const currentEnd = watch(`businessDocuments.${index}.certificateEndDate`);
      const formattedEnd = isoToDateInput(endIso);
      if (formattedEnd && currentEnd !== formattedEnd) {
        setValue(`businessDocuments.${index}.certificateEndDate`, formattedEnd, {
          shouldDirty: false,
          shouldTouch: false,
        });
      }
    });
    // only run when fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  // mark array touched (so handleSaveProgress will include it)
  const markTouched = () => {
    setValue("__businessDocumentsTouched", true, { shouldDirty: true });
  };

  const handleAppend = () => {
    append(emptyDoc);
    markTouched();
  };

  const handleRemove = (index: number) => {
    remove(index);
    markTouched();
    // If we end up with zero rows after remove, append a blank row to keep UI visible
    // append inside a tick to allow remove to finish
    if (fields.length <= 1) {
      setTimeout(() => append(emptyDoc), 0);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Business Documents</h2>
      <p className="text-sm text-gray-600">Add certifications, licenses or other supporting documents.</p>

      {fields.map((field, index) => (
        <div key={field.id} className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Document {index + 1}</h3>
              <p className="text-sm text-gray-500">Fill at least one identifying field to keep this row.</p>
            </div>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                className="text-red-500 hover:text-red-700"
                aria-label={`Remove document ${index + 1}`}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Classification</Label>
              <Input
                placeholder="e.g., CERTIFICATION"
                {...register(`businessDocuments.${index}.classification`, {
                  onChange: () => markTouched(),
                })}
              />
            </div>

            <div>
              <Label>Sub-classification</Label>
              <Input
                placeholder="e.g., ISO 9001"
                {...register(`businessDocuments.${index}.subClassification`, {
                  onChange: () => markTouched(),
                })}
              />
            </div>

            <div>
              <Label>Certifying Agency</Label>
              <Input
                placeholder="Agency / Authority"
                {...register(`businessDocuments.${index}.certifyingAgency`, {
                  onChange: () => markTouched(),
                })}
              />
            </div>

            <div>
              <Label>Other Certifying Agency</Label>
              <Input
                placeholder="If 'Other' selected"
                {...register(`businessDocuments.${index}.otherCertifyingAgency`, {
                  onChange: () => markTouched(),
                })}
              />
            </div>

            <div>
              <Label>Certificate Number</Label>
              <Input
                placeholder="Certificate number / ID"
                {...register(`businessDocuments.${index}.certificateNumber`, {
                  onChange: () => markTouched(),
                })}
              />
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                {...register(`businessDocuments.${index}.certificateStartDate`, {
                  onChange: () => markTouched(),
                })}
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                {...register(`businessDocuments.${index}.certificateEndDate`, {
                  onChange: () => markTouched(),
                })}
              />
            </div>

            <div className="md:col-span-3">
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes about the document"
                {...register(`businessDocuments.${index}.notes`, {
                  onChange: () => markTouched(),
                })}
              />
            </div>

            <div className="md:col-span-3">
              <Label>Attachments (comma-separated URLs, optional)</Label>
              <Input
                placeholder="https://... , https://..."
                {...register(`businessDocuments.${index}.attachments`, {
                  onChange: () => markTouched(),
                })}
              />
              <p className="text-xs text-gray-400 mt-1">If you use URLs, we'll store them as attachments. Replace with file upload later if needed.</p>
            </div>
          </div>
        </div>
      ))}

      <div>
        <Button type="button" variant="outline" onClick={handleAppend}>
          Add Another Document
        </Button>
      </div>
    </div>
  );
}
