"use client";

import { useState } from "react";
import { FaPlus, FaMagic, FaTrash, FaGripVertical, FaPen } from "react-icons/fa";

export default function TabQuestionnaire({ data, onUpdate }: { data?: any, onUpdate?: (updates: any) => void }) {
    const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(0);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handleAddQuestion = () => {
        if (!data?.deliverables || selectedSectionIndex >= data.deliverables.length) return;

        const currentDeliverables = [...data.deliverables];
        const currentSection = currentDeliverables[selectedSectionIndex];

        const newQuestion = {
            id: crypto.randomUUID(),
            text: "",
            type: "Long Text",
            weight: 0,
            mandatory: true
        };

        const updatedQuestions = [...(currentSection.questions || []), newQuestion];
        currentDeliverables[selectedSectionIndex] = { ...currentSection, questions: updatedQuestions };

        if (onUpdate) onUpdate({ deliverables: currentDeliverables });
    };

    const handleUpdateQuestion = (qIndex: number, field: string, value: any) => {
        const currentDeliverables = [...data.deliverables];
        const currentSection = currentDeliverables[selectedSectionIndex];
        const updatedQuestions = [...(currentSection.questions || [])];

        updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], [field]: value };
        currentDeliverables[selectedSectionIndex] = { ...currentSection, questions: updatedQuestions };

        if (onUpdate) onUpdate({ deliverables: currentDeliverables });
    };

    const handleDeleteQuestion = (qIndex: number) => {
        const currentDeliverables = [...data.deliverables];
        const currentSection = currentDeliverables[selectedSectionIndex];
        const updatedQuestions = [...(currentSection.questions || [])];

        updatedQuestions.splice(qIndex, 1);
        currentDeliverables[selectedSectionIndex] = { ...currentSection, questions: updatedQuestions };

        if (onUpdate) onUpdate({ deliverables: currentDeliverables });
    };

    const [generating, setGenerating] = useState<string | null>(null);

    const handleAIAction = async (type: 'technical' | 'esg' | 'gdpr') => {
        if (!data?.deliverables) return;
        setGenerating(type);

        try {
            let sectionIndex = selectedSectionIndex;

            // For GDPR, valid section creation
            if (type === 'gdpr') {
                const newSection = { text: "GDPR Compliance", checked: false, questions: [] };
                const currentDeliverables = [...data.deliverables];
                const updatedDeliverables = [...currentDeliverables, newSection];

                if (onUpdate) onUpdate({ deliverables: updatedDeliverables });

                sectionIndex = updatedDeliverables.length - 1;
                setSelectedSectionIndex(sectionIndex);
            }

            const currentSection = data.deliverables[sectionIndex] || data.deliverables[data.deliverables.length - 1]; // Fallback if async update lags
            const context = currentSection.text || "General Requirement";

            const res = await fetch('/api/ai/generate-ai-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: context,
                    type: type
                })
            });

            if (!res.ok) throw new Error("Generation failed");

            const newQuestions = await res.json();

            // Map to component format
            const formattedQuestions = newQuestions.map((q: any) => ({
                id: q.id || crypto.randomUUID(),
                text: q.question,
                type: "Long Text",
                weight: 0,
                mandatory: true
            }));

            // We need to re-read data because state might have updated if we added a section
            // In a real app we'd rely on 'data' prop updating, but here we might need to be careful.
            // We will assume 'onUpdate' triggers a parent state update which flows back down.
            // BUT, since we just called onUpdate for GDPR, we can't immediately read 'data' reliably if it's async from parent.
            // So we'll update based on what we know.

            // Re-fetch latest deliverables array structure we just pushed (or existing)
            const latestDeliverables = [...data.deliverables];
            if (type === 'gdpr') {
                // Ensure we are adding to the *newly created* section specifically
                // logic duplicated for safety
                if (latestDeliverables[latestDeliverables.length - 1].text !== "GDPR Compliance") {
                    latestDeliverables.push({ text: "GDPR Compliance", checked: false, questions: [] });
                }
                sectionIndex = latestDeliverables.length - 1;
            }

            const targetSection = latestDeliverables[sectionIndex];
            const updatedQuestions = [...(targetSection.questions || []), ...formattedQuestions];

            latestDeliverables[sectionIndex] = { ...targetSection, questions: updatedQuestions };

            if (onUpdate) onUpdate({ deliverables: latestDeliverables });
            if (type === 'gdpr') setSelectedSectionIndex(sectionIndex);

        } catch (e) {
            console.error(e);
            alert("Failed to generate questions. Please try again.");
        } finally {
            setGenerating(null);
        }
    };

    return (
        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-280px)]">
            {/* Left: Section List */}
            <div className="col-span-3 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 font-medium text-gray-700 flex justify-between items-center">
                    <span>Sections</span>
                    <button
                        onClick={() => {
                            const newSection = { text: "New Section", checked: false, questions: [] };
                            const current = data?.deliverables || [];
                            const updated = [...current.map((d: any) => typeof d === 'string' ? { text: d, checked: false } : d), newSection];
                            if (onUpdate) onUpdate({ deliverables: updated });
                            setEditingIndex(updated.length - 1);
                            setSelectedSectionIndex(updated.length - 1);
                        }}
                        className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                    >
                        <FaPlus />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {data?.deliverables && Array.isArray(data.deliverables) && data.deliverables.map((d: any, i: number) => (
                        <div
                            key={i}
                            onClick={() => setSelectedSectionIndex(i)}
                            className={`group flex items-start justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer gap-2 ${selectedSectionIndex === i ? "bg-blue-50 border border-blue-100 text-blue-700" : "hover:bg-gray-50 border border-transparent"}`}
                        >
                            {editingIndex === i ? (
                                <input
                                    type="text"
                                    autoFocus
                                    className="bg-white border border-blue-300 rounded px-2 py-1 text-gray-700 font-medium w-full text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                    value={d.text || (typeof d === 'string' ? d : "")}
                                    placeholder="Section Name"
                                    onBlur={() => setEditingIndex(null)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') setEditingIndex(null);
                                    }}
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        const current = [...data.deliverables];
                                        if (typeof current[i] === 'string') {
                                            current[i] = { text: newVal, checked: false };
                                        } else {
                                            current[i] = { ...current[i], text: newVal };
                                        }
                                        if (onUpdate) onUpdate({ deliverables: current });
                                    }}
                                />
                            ) : (
                                <div className="flex-1 flex justify-between items-center">
                                    <span className="font-medium break-words py-1 leading-snug">
                                        {d.text || (typeof d === 'string' ? d : "Untitled Section")}
                                    </span>
                                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-2">
                                        {d.questions?.length || 0}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-1 shrink-0">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingIndex(i); }}
                                    className="text-gray-400 hover:text-blue-500 p-1 rounded hover:bg-blue-50"
                                    title="Edit Section"
                                >
                                    <FaPen size={10} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const current = [...data.deliverables];
                                        current.splice(i, 1);
                                        if (onUpdate) onUpdate({ deliverables: current });
                                        if (selectedSectionIndex === i && i > 0) setSelectedSectionIndex(i - 1);
                                        else if (selectedSectionIndex === i && current.length > 0) setSelectedSectionIndex(0);
                                        else if (selectedSectionIndex === i && current.length === 0) setSelectedSectionIndex(0); // Or null, depending on desired behavior
                                    }}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                                    title="Delete Section"
                                >
                                    <FaTrash size={10} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {!data?.deliverables?.length && (
                        <p className="text-xs text-center text-gray-400 py-4">No sections yet.</p>
                    )}
                </div>
            </div>

            {/* Right: Question Card */}
            <div className="col-span-9 space-y-6 overflow-y-auto pr-2 pb-10">
                {data?.deliverables?.[selectedSectionIndex] ? (
                    <>
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {data.deliverables[selectedSectionIndex].text || "Untitled Section"} Questions
                            </h3>
                            <button
                                onClick={handleAddQuestion}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2"
                            >
                                <FaPlus /> Add Question
                            </button>
                        </div>

                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                            <button onClick={() => handleAIAction('technical')} disabled={!!generating} className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-purple-50 border border-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-100 transition shadow-sm disabled:opacity-50">
                                <FaMagic size={12} /> {generating === 'technical' ? 'Generating...' : 'Generate Technical Questions'}
                            </button>
                            <button onClick={() => handleAIAction('esg')} disabled={!!generating} className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-green-50 border border-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-100 transition shadow-sm disabled:opacity-50">
                                <FaMagic size={12} /> {generating === 'esg' ? 'Adding...' : 'Add ESG Questions'}
                            </button>
                            <button onClick={() => handleAIAction('gdpr')} disabled={!!generating} className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition shadow-sm disabled:opacity-50">
                                <FaMagic size={12} /> {generating === 'gdpr' ? 'Creating Section...' : 'Add GDPR Section'}
                            </button>
                        </div>

                        {/* Question Cards */}
                        <div className="space-y-4">
                            {data.deliverables[selectedSectionIndex]?.questions?.map((q: any, idx: number) => (
                                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded">Q{idx + 1}</span>
                                            <div className="text-gray-300 cursor-move hover:text-gray-500"><FaGripVertical /></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {q.mandatory && (
                                                <span className="bg-red-50 text-red-600 text-xs font-semibold px-2 py-1 rounded border border-red-100">Mandatory</span>
                                            )}
                                            <button
                                                onClick={() => handleDeleteQuestion(idx)}
                                                className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Question Text</label>
                                            <textarea
                                                className="w-full border border-gray-200 rounded-lg p-3 text-gray-700 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none text-sm"
                                                rows={2}
                                                value={q.text}
                                                placeholder="Enter your question here..."
                                                onChange={(e) => handleUpdateQuestion(idx, 'text', e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Response Type</label>
                                                <select
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                                                    value={q.type}
                                                    onChange={(e) => handleUpdateQuestion(idx, 'type', e.target.value)}
                                                >
                                                    <option>Long Text</option>
                                                    <option>Short Text</option>
                                                    <option>Yes/No</option>
                                                    <option>Multiple Choice</option>
                                                    <option>File Upload</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Weight (%)</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                                                        value={q.weight}
                                                        onChange={(e) => handleUpdateQuestion(idx, 'weight', parseInt(e.target.value))}
                                                    />
                                                    <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center h-full pt-5">
                                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                                        checked={!!q.mandatory}
                                                        onChange={(e) => handleUpdateQuestion(idx, 'mandatory', e.target.checked)}
                                                    />
                                                    <span className="font-medium">Required</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!data.deliverables[selectedSectionIndex]?.questions || data.deliverables[selectedSectionIndex].questions.length === 0) && (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <p className="text-gray-500 mb-2">No questions in this section yet.</p>
                                    <button onClick={handleAddQuestion} className="text-blue-600 font-medium hover:underline">Add your first question</button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <p>Select a section to manage questions</p>
                    </div>
                )}
            </div>
        </div>
    );
}
