
"use client";

import { useState } from "react";
import { FaCheckCircle, FaFileAlt } from "react-icons/fa";

interface Question {
    id: string;
    text: string;
    type: string;
    mandatory: boolean;
    weight?: number;
}

interface Section {
    text: string;
    questions: Question[];
}

interface SupplierTabQuestionnaireProps {
    data: any; // The RFP object containing 'deliverables' (sections)
    answers: Record<string, any>; // Keyed by question ID
    onAnswerChange: (questionId: string, value: any) => void;
    readOnly?: boolean;
}

export default function SupplierTabQuestionnaire({ data, answers, onAnswerChange, readOnly = false }: SupplierTabQuestionnaireProps) {
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);

    const sections: Section[] = data?.deliverables || [];

    if (!sections || sections.length === 0) {
        return <div className="p-8 text-center text-gray-500">No questionnaire sections found for this RFP.</div>;
    }

    const activeSection = sections[activeSectionIndex];

    return (
        <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Sidebar: Sections */}
            <div className="w-full md:w-72 bg-white border border-gray-200 rounded-xl overflow-y-auto shadow-sm h-fit flex-shrink-0">
                <div className="p-4 border-b border-gray-100 font-bold text-gray-800 bg-gray-50/50">Sections</div>
                <div className="p-3 space-y-1">
                    {sections.map((section, idx) => {
                        // Calculate completion?
                        const qCount = section.questions?.length || 0;
                        const answeredCount = section.questions?.filter(q => answers[q.id]).length || 0;
                        const isComplete = qCount > 0 && qCount === answeredCount;

                        return (
                            <button
                                key={idx}
                                onClick={() => setActiveSectionIndex(idx)}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm flex items-center justify-between group transition-all duration-200
                                    ${activeSectionIndex === idx
                                        ? "bg-blue-600 text-white font-medium shadow-md shadow-blue-200"
                                        : "text-gray-600 hover:bg-gray-100"}
                                `}
                            >
                                <span className="truncate pr-2 font-medium">{section.text || `Section ${idx + 1}`}</span>
                                {isComplete && <FaCheckCircle className={`${activeSectionIndex === idx ? "text-white" : "text-green-500"} shrink-0`} size={14} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main: Questions */}
            <div className="flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar">
                <div className="sticky top-0 bg-white/90 backdrop-blur py-4 z-10 border-b border-gray-100 mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">{activeSection.text}</h3>
                    <p className="text-gray-500 text-sm mt-1">Please answer all mandatory questions in this section.</p>
                </div>

                <div className="space-y-8">
                    {activeSection.questions?.map((q, qIdx) => (
                        <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <label className="block text-gray-900 font-bold text-lg leading-snug">
                                    <span className="text-gray-300 mr-3 font-mono text-sm">#{qIdx + 1}</span>
                                    {q.text}
                                    {q.mandatory && <span className="text-red-500 ml-1" title="Mandatory">*</span>}
                                </label>
                                {q.weight && q.weight > 0 && (
                                    <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded border border-blue-100 tracking-wide">Weight: {q.weight}%</span>
                                )}
                            </div>

                            <div className="mt-4 pl-8">
                                {q.type === "Long Text" && (
                                    <textarea
                                        disabled={readOnly}
                                        value={answers[q.id]?.value || ""}
                                        onChange={(e) => onAnswerChange(q.id, { value: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl p-4 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 min-h-[140px] outline-none transition-all resize-y text-gray-700 bg-gray-50 focus:bg-white"
                                        placeholder="Enter your detailed response here..."
                                    />
                                )}
                                {q.type === "Short Text" && (
                                    <input
                                        type="text"
                                        disabled={readOnly}
                                        value={answers[q.id]?.value || ""}
                                        onChange={(e) => onAnswerChange(q.id, { value: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl p-4 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all text-gray-700 bg-gray-50 focus:bg-white"
                                        placeholder="Enter your answer..."
                                    />
                                )}
                                {q.type === "Yes/No" && (
                                    <div className="flex gap-6">
                                        {["Yes", "No"].map((opt) => (
                                            <label key={opt} className={`flex items-center gap-3 cursor-pointer border px-6 py-3 rounded-xl transition-all ${answers[q.id]?.value === opt ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                                                <input
                                                    type="radio"
                                                    name={`q-${q.id}`}
                                                    value={opt}
                                                    checked={answers[q.id]?.value === opt}
                                                    onChange={() => onAnswerChange(q.id, { value: opt })}
                                                    disabled={readOnly}
                                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {q.type === "File Upload" && (
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <FaFileAlt className="mx-auto text-gray-300 group-hover:text-blue-500 transition-colors mb-4" size={32} />
                                        <p className="font-medium text-gray-700 mb-2">Click to upload document</p>
                                        <p className="text-xs text-gray-400 mb-4">Supported formats: PDF, DOCX, XLSX</p>
                                        <input
                                            type="file"
                                            disabled={readOnly}
                                            className="hidden"
                                            id={`file-q-${q.id}`}
                                            onChange={(e) => {
                                                alert("File upload logic to be implemented");
                                            }}
                                        />
                                        <label htmlFor={`file-q-${q.id}`} className="bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer">
                                            Select File
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {!activeSection.questions?.length && (
                        <div className="p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-500 italic">No questions in this section.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
