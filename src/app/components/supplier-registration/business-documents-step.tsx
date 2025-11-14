"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Trash2, Upload, FileText, X, Download } from "lucide-react";

/**
 * BusinessDocumentsStep with S3 File Upload
 */
export default function BusinessDocumentsStep() {
  const { control, register, setValue, watch, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "businessDocuments" as const,
  });

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

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

  const isoToDateInput = (iso?: string | null) => {
    if (!iso) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    if (typeof iso === "string" && iso.includes("T")) {
      return iso.slice(0, 10);
    }
    return "";
  };

  useEffect(() => {
    if (fields.length === 0) {
      append(emptyDoc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length]);

  useEffect(() => {
    fields.forEach((field, index) => {
      const startIso = (field as any).certificateStartDate;
      const endIso = (field as any).certificateEndDate;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  const markTouched = () => {
    setValue("__businessDocumentsTouched", true, { shouldDirty: true });
  };

  const handleAppend = () => {
    append(emptyDoc);
    markTouched();
  };

  const handleRemove = (index: number) => {
    // Mark attachments for deletion before removing
    const doc = getValues(`businessDocuments.${index}`);
    if (doc?.attachments && Array.isArray(doc.attachments) && doc.attachments.length > 0) {
      const filesToDelete = getValues("businessDocuments.__filesToDelete") || [];
      const urlsToDelete = doc.attachments.filter((url: string) => 
        url && typeof url === 'string' && !url.startsWith("/")
      );
      
      if (urlsToDelete.length > 0) {
        setValue("businessDocuments.__filesToDelete", [...filesToDelete, ...urlsToDelete], {
          shouldDirty: true,
        });
      }
    }

    remove(index);
    markTouched();
    
    if (fields.length <= 1) {
      setTimeout(() => append(emptyDoc), 0);
    }
  };

  const handleFileUpload = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingIndex(index);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let contentType = file.type || "application/octet-stream";
        if (contentType === "image/jpg") contentType = "image/jpeg";

        // Get presigned URL
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType }),
        });

        if (!presignRes.ok) {
          const err = await presignRes.json().catch(() => null);
          throw new Error(err?.error || "Failed to prepare upload");
        }

        const { url, fields: s3Fields, publicUrl } = await presignRes.json();

        // Upload to S3
        const formData = new FormData();
        Object.entries(s3Fields).forEach(([k, v]) => formData.append(k, String(v)));
        formData.append("Content-Type", contentType);
        formData.append("file", file);

        const uploadRes = await fetch(url, { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const txt = await uploadRes.text().catch(() => "");
          throw new Error(`S3 upload failed: ${txt || uploadRes.statusText}`);
        }

        uploadedUrls.push(publicUrl);
      }

      // Update form with new attachments
      const currentAttachments = watch(`businessDocuments.${index}.attachments`) || [];
      const newAttachments = [...currentAttachments, ...uploadedUrls];
      
      setValue(`businessDocuments.${index}.attachments`, newAttachments, {
        shouldDirty: true,
        shouldValidate: false,
      });

      markTouched();

      // Clear file input
      if (fileInputRefs.current[index]) {
        fileInputRefs.current[index]!.value = "";
      }

      alert(`Successfully uploaded ${uploadedUrls.length} file(s)`);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(err?.message || "Upload failed. Please try again.");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemoveAttachment = (docIndex: number, attachmentIndex: number) => {
    const currentAttachments = watch(`businessDocuments.${docIndex}.attachments`) || [];
    const fileToRemove = currentAttachments[attachmentIndex];
    
    // Mark file for deletion
    if (fileToRemove && typeof fileToRemove === 'string' && !fileToRemove.startsWith("/")) {
      const filesToDelete = getValues("businessDocuments.__filesToDelete") || [];
      setValue("businessDocuments.__filesToDelete", [...filesToDelete, fileToRemove], {
        shouldDirty: true,
      });
    }

    // Remove from attachments array
    const newAttachments = currentAttachments.filter((_: any, i: number) => i !== attachmentIndex);
    setValue(`businessDocuments.${docIndex}.attachments`, newAttachments, {
      shouldDirty: true,
      shouldValidate: false,
    });
    
    markTouched();
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Business Documents</h2>
      <p className="text-sm text-gray-600">Add certifications, licenses or other supporting documents.</p>

      {fields.map((field, index) => {
        const attachments = watch(`businessDocuments.${index}.attachments`) || [];
        const isUploading = uploadingIndex === index;

        return (
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

              {/* File Upload Section */}
              <div className="md:col-span-3">
                <Label>Document Attachments</Label>
                
                <input
                  ref={(el) => {
                    fileInputRefs.current[index] = el;
                  }}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(index, e.target.files)}
                  disabled={isUploading}
                />

                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    disabled={isUploading}
                    className="w-full md:w-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload Files"}
                  </Button>
                </div>

                {/* Display uploaded files */}
                {Array.isArray(attachments) && attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-600">Uploaded Files:</p>
                    {attachments.filter(Boolean).map((url: string, attIndex: number) => {
                      if (!url || typeof url !== 'string') return null;
                      
                      const fileName = url.split('/').pop() || `File ${attIndex + 1}`;
                      
                      return (
                        <div key={attIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded border text-sm">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-blue-600 hover:underline truncate"
                            >
                              {fileName}
                            </a>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-1 hover:bg-gray-200 rounded"
                              title="Download"
                            >
                              <Download className="h-3 w-3 text-gray-600" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(index, attIndex)}
                              className="p-1 hover:bg-red-100 rounded"
                              title="Remove"
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div>
        <Button type="button" variant="outline" onClick={handleAppend}>
          Add Another Document
        </Button>
      </div>
    </div>
  );
}