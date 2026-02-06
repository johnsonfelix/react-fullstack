
"use client";

import { FaDownload, FaFileUpload, FaPaperclip, FaTrash, FaEye } from "react-icons/fa";

interface SupplierTabAttachmentsProps {
    data: any;
    responses: any[]; // List of uploaded files
    onUpload: (file: any) => void;
    onRemove: (fileId: string) => void;
    readOnly?: boolean;
}

export default function SupplierTabAttachments({ data, responses, onUpload, onRemove, readOnly = false }: SupplierTabAttachmentsProps) {
    // Buyer Attachments
    const attachments = data.attachments || [];

    return (
        <div className="space-y-8">
            {/* Buyer Attachments */}
            <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <FaPaperclip />
                    </div>
                    Documents from Buyer
                </h2>
                {attachments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {attachments.map((file: any, idx: number) => (
                            <div key={idx} className="group flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200 bg-white">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <FaFileDownloadShortcut fileName={file.name || "Document"} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-gray-800 truncate" title={file.name || "Document"}>{file.name || "Document"}</span>
                                        <span className="text-xs text-gray-500">Attachment</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.open(file.url, '_blank')}
                                    className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-100 transition-colors"
                                    title="Download"
                                >
                                    <FaDownload />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500 italic">No documents provided by the buyer.</p>
                    </div>
                )}
            </div>

            {/* Supplier Uploads */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FaFileUpload className="text-green-600" /> Your Attachments
                </h2>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition mb-6">
                    <FaFileUpload className="mx-auto text-gray-400 mb-3" size={32} />
                    <p className="text-gray-600 font-medium mb-1">Drag & Drop files here</p>
                    <p className="text-gray-400 text-sm mb-4">or click to browse</p>
                    <input
                        type="file"
                        disabled={readOnly}
                        className="hidden"
                        id="file-upload"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                onUpload(e.target.files[0]);
                                e.target.value = ""; // Allow re-uploading same file
                            }
                        }}
                    />
                    <label
                        htmlFor={readOnly ? "" : "file-upload"}
                        className={`inline-block bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded shadow-sm hover:bg-gray-100 transition cursor-pointer ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        Browse Files
                    </label>
                </div>

                {responses && responses.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Uploaded Files</h3>
                        {responses.map((file: any) => (
                            <div key={file.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                                <span className="text-sm text-gray-800">{file.name}</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => window.open(file.url, '_blank')}
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                        title="View File"
                                    >
                                        <FaEye />
                                    </button>
                                    <button onClick={() => onRemove(file.id)} disabled={readOnly} className="text-red-400 hover:text-red-600 transition-colors" title="Remove">
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const FaFileDownloadShortcut = ({ fileName }: { fileName: string }) => {
    // Simple icon switcher based on extension could go here
    return <FaPaperclip />;
}
