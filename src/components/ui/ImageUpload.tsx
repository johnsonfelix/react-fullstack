"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    onRemove: (url: string) => void;
    disabled?: boolean;
}

export default function ImageUpload({
    value,
    onChange,
    onRemove,
    disabled
}: ImageUploadProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (value) {
        return (
            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                <div className="z-10 absolute top-2 right-2">
                    <button
                        type="button"
                        onClick={() => onRemove(value)}
                        className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow-sm"
                        disabled={disabled}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <Image
                    fill
                    style={{ objectFit: "cover" }}
                    alt="Image"
                    src={value}
                    className="object-cover"
                />
            </div>
        );
    }

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Upload failed");
            }

            const data = await res.json();
            onChange(data.url);
        } catch (error: any) {
            console.error("Upload error:", error);
            alert(error.message || "Something went wrong during upload.");
        } finally {
            setLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="w-full">
            <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition cursor-pointer h-48"
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={onUpload}
                    disabled={disabled || loading}
                />

                {loading ? (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-sm">Uploading...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                        <div className="p-3 bg-gray-100 rounded-full">
                            <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">Click to upload</p>
                            <p className="text-xs text-gray-500">SVG, PNG, JPG or GIF</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
