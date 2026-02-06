"use client";

import React from "react";
import { FaFileUpload, FaMagic, FaFilePdf, FaFileExcel, FaTrash, FaTimes } from "react-icons/fa";

export default function TabAttachments({ data, onUpdate, onAutoSave }: {
    data?: any,
    onUpdate?: (updates: any) => void,
    onAutoSave?: (updates: any) => void
}) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = React.useState(false);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error("Upload failed");
            }

            const newFile = await res.json();
            const currentAttachments = data?.attachments || [];
            const updatedAttachments = [...currentAttachments, newFile];

            if (onAutoSave) {
                onAutoSave({ attachments: updatedAttachments });
            } else if (onUpdate) {
                onUpdate({ attachments: updatedAttachments });
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload file. Please try again.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Upload failed");
            }

            const newFile = await res.json();
            const currentAttachments = data?.attachments || [];
            const updatedAttachments = [...currentAttachments, newFile];

            if (onAutoSave) {
                onAutoSave({ attachments: updatedAttachments });
            } else if (onUpdate) {
                onUpdate({ attachments: updatedAttachments });
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload file. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (index: number) => {
        const currentAttachments = data?.attachments || [];
        const updated = currentAttachments.filter((_: any, i: number) => i !== index);
        if (onAutoSave) {
            onAutoSave({ attachments: updated });
        } else if (onUpdate) {
            onUpdate({ attachments: updated });
        }
    };

    return (
        <div className="space-y-8">
            <input
                type="file"
                hidden
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
            />

            {/* Upload Zone */}
            <div
                className={`border-2 border-dashed border-gray-300 rounded-xl p-10 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={handleFileSelect}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className="text-gray-400 text-5xl mb-2">
                    <FaFileUpload />
                </div>
                <div>
                    <p className="text-gray-600 font-medium text-lg">
                        {uploading ? "Uploading..." : "Drop files here or click to upload"}
                    </p>
                    <p className="text-sm text-gray-400 mt-2">Supported formats: PDF, DOC, XLS, PPT (Max 10MB per file)</p>
                </div>
                <button
                    disabled={uploading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm mt-2 disabled:bg-blue-400"
                >
                    {uploading ? "Uploading..." : "Choose files"}
                </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button className="flex items-center gap-2 text-purple-600 bg-purple-50 px-4 py-2 rounded-lg font-medium hover:bg-purple-100 transition border border-purple-100">
                    <FaMagic /> AI Extract Specs
                </button>
                <button className="flex items-center gap-2 text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition">
                    Upload from Template Library
                </button>
            </div>

            {/* File Grid */}
            <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Uploaded Files ({data?.attachments?.length || 0})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data?.attachments && data.attachments.length > 0 ? (
                        data.attachments.map((file: any, i: number) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow group relative">
                                <div className={`p-3 rounded-lg ${file.type === "pdf" ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"}`}>
                                    {file.type === "pdf" ? <FaFilePdf size={24} /> : <FaFileExcel size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 truncate" title={file.name}>{file.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{file.size} • Uploaded {file.uploadedAt || "just now"}</p>

                                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                                        <button
                                            onClick={() => window.open(file.url, '_blank')}
                                            className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1"
                                        >
                                            <FaFileUpload className="text-xs" /> View / Download
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center text-gray-500 py-12 italic border border-gray-100 rounded-xl bg-gray-50/50">
                            No attachments uploaded yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
