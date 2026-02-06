"use client";

import { useState } from "react";
import { FaTimes, FaMagic, FaFileUpload, FaFileAlt } from "react-icons/fa";

interface AiAssistDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AiAssistDrawer({ isOpen, onClose, data }: { isOpen: boolean; onClose: () => void; data?: any }) {
    const [activeTab, setActiveTab] = useState("intake");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[420px] bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
            {/* Header */}
            <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-gray-50">
                <div className="flex items-center gap-2 text-blue-700">
                    <FaMagic />
                    <h2 className="font-semibold text-lg">AI Event Builder</h2>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <FaTimes />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Requirement Intake */}
                <section>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Requirement Intake</label>
                    <textarea
                        className="w-full h-32 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                        placeholder="Paste PR details or describe your sourcing requirement here..."
                    />
                </section>

                {/* File Upload */}
                <section>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Reference Documents</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                            <FaFileUpload />
                        </div>
                        <p className="text-sm text-gray-600">
                            <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, Docx, Excel up to 10MB</p>
                    </div>
                </section>

                {/* Detected Attributes */}
                <section>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Detected Attributes</label>
                    <div className="flex flex-wrap gap-2">
                        {data?.detectedAttributes ? (
                            data.detectedAttributes.map((chip: string) => (
                                <span key={chip} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-100">
                                    {chip}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-gray-400 italic">No attributes detected yet.</span>
                        )}
                    </div>
                </section>

                {/* Extracted Summary */}
                <section>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Extracted Summary</label>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        {data?.extractedSummary ? (
                            <ul className="space-y-2">
                                {data.extractedSummary.map((item: string, idx: number) => (
                                    <li key={idx} className="flex gap-2 text-sm text-gray-600">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 flex-shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-500 italic">No summary available.</p>
                        )}
                    </div>
                </section>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
                <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
                    <FaMagic />
                    Generate Draft RFP
                </button>
            </div>
        </div>
    );
}
