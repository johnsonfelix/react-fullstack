import { useFormContext } from "react-hook-form";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textArea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { Info, UploadCloud, FileText, Download, X } from "lucide-react";
import { useRef, useState } from "react";

export default function CompanyDetailsStep() {
  const { register, formState: { errors }, control, setValue, watch } = useFormContext();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Watch the profileAttachments array
  const attachments = watch("companyDetails.profileAttachments") || [];

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
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

        const { url, fields, publicUrl } = await presignRes.json();

        // Upload to S3
        const formData = new FormData();
        Object.entries(fields).forEach(([k, v]) => formData.append(k, String(v)));
        formData.append("Content-Type", contentType);
        formData.append("file", file);

        const uploadRes = await fetch(url, { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const txt = await uploadRes.text().catch(() => "");
          throw new Error(`S3 upload failed: ${txt || uploadRes.statusText}`);
        }

        uploadedUrls.push(publicUrl);
      }

      // Update form with new attachments (simple string array)
      const currentAttachments = watch("companyDetails.profileAttachments") || [];
      setValue("companyDetails.profileAttachments", [...currentAttachments, ...uploadedUrls], {
        shouldDirty: true,
        shouldValidate: false,
      });

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      alert(`Successfully uploaded ${uploadedUrls.length} file(s)`);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(err?.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    const currentAttachments = watch("companyDetails.profileAttachments") || [];
    const fileToRemove = currentAttachments[index];
    
    // Mark file for deletion
    const filesToDelete = watch("companyDetails.__filesToDelete") || [];
    if (fileToRemove && typeof fileToRemove === 'string' && !fileToRemove.startsWith("/")) {
      setValue("companyDetails.__filesToDelete", [...filesToDelete, fileToRemove], {
        shouldDirty: true,
      });
    }

    // Remove from attachments array
    const newAttachments = currentAttachments.filter((_: any, i: number) => i !== index);
    setValue("companyDetails.profileAttachments", newAttachments, {
      shouldDirty: true,
      shouldValidate: false,
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-6xl">
      <h1 className="text-2xl font-bold mb-4">Company Details</h1>

      <div className="bg-red-50 p-4 rounded-md mb-6">
          <p className="font-semibold text-red-800 flex items-center"><Info className="h-5 w-5 mr-2" />Welcome to Supplier Onboarding Portal</p>
          <ul className="list-disc list-inside text-sm text-gray-700 mt-2 pl-4">
              <li>Please provide the information required as prompted.</li>
              <li>Please read the information and prompts on the page carefully and enter the relevant information.</li>
              <li>We look forward to partnering with you.</li>
          </ul>
      </div>

      <div className="space-y-6">
        <div>
            <p className="text-sm text-gray-600">This form is used for identifying, assessing, appointing, and onboarding suppliers enabling to pay its suppliers. For details of how we process your personal information</p>
            <p className="text-red-600 font-semibold mt-4">ENTER THE COMPANY NAME IN CAPITAL LETTERS ONLY.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="companyName">Company Name (in capital letters as per trade license)</Label>
            <Input id="companyName" {...register("companyDetails.companyName")} placeholder="Chris Technologies Pvt Ltd" />
            {/* @ts-ignore */}
            <p className="text-red-500 text-xs mt-1">{errors.companyDetails?.companyName?.message}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" {...register("companyDetails.website")} />
                {/* @ts-ignore */}
                <p className="text-red-500 text-xs mt-1">{errors.companyDetails?.website?.message}</p>
             </div>
             <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" {...register("companyDetails.country")} placeholder="India" />
                {/* @ts-ignore */}
                <p className="text-red-500 text-xs mt-1">{errors.companyDetails?.country?.message}</p>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="tradeLicenseNumber">Trade License Number / Certificate of Incorporation</Label>
            <Input id="tradeLicenseNumber" {...register("companyDetails.tradeLicenseNumber")} placeholder="13245689012" />
            {/* @ts-ignore */}
            <p className="text-red-500 text-xs mt-1">{errors.companyDetails?.tradeLicenseNumber?.message}</p>
          </div>
          <div>
            <Label htmlFor="taxRegistrationNumber">Tax Registration Number</Label>
            <Input id="taxRegistrationNumber" {...register("companyDetails.taxRegistrationNumber")} placeholder="13245689012" />
            {/* @ts-ignore */}
            <p className="text-red-500 text-xs mt-1">{errors.companyDetails?.taxRegistrationNumber?.message}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="organizationType">Organization Type</Label>
                <Input id="organizationType" {...register("companyDetails.organizationType")} placeholder="Partnership" />
                 {/* @ts-ignore */}
                <p className="text-red-500 text-xs mt-1">{errors.companyDetails?.organizationType?.message}</p>
            </div>
            <div>
                <Label htmlFor="supplierType">Supplier Type</Label>
                <Input id="supplierType" {...register("companyDetails.supplierType")} placeholder="Private Company (PTY LTD)" />
                 {/* @ts-ignore */}
                <p className="text-red-500 text-xs mt-1">{errors.companyDetails?.supplierType?.message}</p>
            </div>
        </div>

        <div>
          <Label htmlFor="noteToApprover">Note to Approver</Label>
          <Textarea id="noteToApprover" {...register("companyDetails.noteToApprover")} rows={3} />
          {/* @ts-ignore */}
          <p className="text-red-500 text-xs mt-1">{errors.companyDetails?.noteToApprover?.message}</p>
        </div>

        <div>
            <h3 className="text-lg font-semibold mb-2">Profile Attachments</h3>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={isUploading}
            />

            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-gray-400 transition-colors"
              onClick={() => !isUploading && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  {isUploading ? "Uploading..." : "Drag and Drop"}
                </p>
                <p className="text-xs text-gray-500">
                  {isUploading ? "Please wait..." : "Select or drop files here"}
                </p>
            </div>

            {/* Display uploaded files */}
            {Array.isArray(attachments) && attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                {attachments.filter(Boolean).map((url: string, index: number) => {
                  if (!url || typeof url !== 'string') return null;
                  
                  const fileName = url.split('/').pop() || `Attachment ${index + 1}`;
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                      <div className="flex items-center gap-2 flex-1">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-sm text-blue-600 hover:underline truncate"
                        >
                          {fileName}
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Download"
                        >
                          <Download className="h-4 w-4 text-gray-600" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="p-1 hover:bg-red-100 rounded"
                          title="Remove"
                        >
                          <X className="h-4 w-4 text-red-600" />
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
}