
"use client";

import { useState } from "react";
import { Upload, Loader2, FileCode } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CxmlUpload() {
    const router = useRouter();
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".xml")) {
            alert("Please upload a valid .xml file");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/supplier/catalog/cxml", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Upload failed");
            }

            let message = `Successfully processed ${data.processed} items.`;
            if (data.errors && data.errors.length > 0) {
                message += `\n\n${data.errors.length} items failed:\n` +
                    data.errors.map((e: any) => `- Part ${e.id}: ${e.error}`).join("\n");
            }

            alert(message);
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to upload cXML");
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    return (
        <div className="relative">
            <input
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
            />
            <button
                disabled={uploading}
                className="flex items-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
            >
                {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Upload className="w-4 h-4 mr-2" />
                )}
                Import cXML
            </button>
        </div>
    );
}
