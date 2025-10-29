import { useFormContext } from "react-hook-form";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textArea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"; // Assuming you have a Select component
import { Button } from "@/app/components/ui/button";
import { Info, UploadCloud, FileText, Download, X } from "lucide-react";

export default function CompanyDetailsStep() {
  const { register, formState: { errors }, control } = useFormContext();

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
            {/* <p className="text-sm text-gray-600 mt-2">Enter a value for at least one of these fields: Trade License Number</p> */}
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
                {/* For Select with react-hook-form, you should use the Controller component */}
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
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-gray-400">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Drag and Drop</p>
                <p className="text-xs text-gray-500">Select or drop files here</p>
                {/* You would typically use a library like react-dropzone and connect its state here */}
            </div>
        </div>

        <div>
            <Label htmlFor="attachmentUrl">URL</Label>
            <div className="flex gap-2">
                <Input id="attachmentUrl" {...register("companyDetails.attachmentUrl")} placeholder="Enter URL" />
                <Button type="button" variant="outline">Add URL</Button>
            </div>
        </div>

 
      </div>
    </div>
  );
}
