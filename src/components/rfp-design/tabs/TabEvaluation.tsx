"use client";

import { useState } from "react";
import { FaPlus, FaMagic, FaSlidersH } from "react-icons/fa";

export default function TabEvaluation({ data, onUpdate }: { data?: any, onUpdate?: (updates: any) => void }) {
    const [techWeight, setTechWeight] = useState(data?.evaluationDetails?.weights?.technical || 60);
    const [subCriteria, setSubCriteria] = useState<{ technical: any[], commercial: any[] }>({
        technical: data?.evaluationDetails?.subCriteria?.technical || [],
        commercial: data?.evaluationDetails?.subCriteria?.commercial || []
    });
    const [isGenerating, setIsGenerating] = useState(false);

    const generateCriteria = async () => {
        if (!data?.sowSummary) {
            alert("Please add a SOW Summary in the Scope tab first.");
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch("/api/ai/generate-evaluation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sowSummary: data.sowSummary,
                    category: data.category
                })
            });
            const result = await res.json();
            if (result.technical && result.commercial) {
                setSubCriteria(result);
                // Also auto-set the slider if needed, but keeping it flexible
                setTechWeight(70);

                // Update parent
                if (onUpdate) {
                    onUpdate({
                        evaluationDetails: {
                            weights: { technical: 70, commercial: 30 },
                            subCriteria: result
                        }
                    });
                }
            }
        } catch (e) {
            console.error(e);
            alert("Failed to generate criteria.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubChange = (type: 'technical' | 'commercial', index: number, field: string, value: any) => {
        const updated = { ...subCriteria };
        updated[type][index] = { ...updated[type][index], [field]: value };
        setSubCriteria(updated);
        if (onUpdate) {
            onUpdate({
                evaluationDetails: {
                    weights: { technical: techWeight, commercial: 100 - techWeight },
                    subCriteria: updated
                }
            });
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Criteria Sliders */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <FaSlidersH className="text-gray-400" /> Evaluation Method
                </h3>

                <div className="space-y-8">
                    {/* Technical */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="font-medium text-gray-700">Technical</label>
                            <span className="font-bold text-gray-900">{techWeight}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={techWeight}
                            onChange={(e) => setTechWeight(parseInt(e.target.value))}
                            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">Quality, Features, Compliance</p>
                    </div>

                    {/* Commercial */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="font-medium text-gray-700">Commercial</label>
                            <span className="font-bold text-gray-900">{100 - techWeight}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={100 - techWeight}
                            disabled
                            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-not-allowed accent-green-600 range-green"
                        />
                        <p className="text-xs text-gray-500 mt-1">Price, TCO, Payment Terms</p>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                    {/* Fallback button if they want to manually add later, currently redirect logic not fully defined so keeping simple */}
                    <button
                        onClick={generateCriteria}
                        disabled={isGenerating}
                        className="flex items-center gap-2 text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded-lg transition"
                    >
                        {isGenerating ? "Generating..." : <><FaPlus /> Apply Specific Criterion (AI)</>}
                    </button>
                </div>
            </div>

            {/* Sub Criteria Render */}
            {subCriteria.technical.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm space-y-8">

                    {/* Technical Sub-Criteria */}
                    <div>
                        <h4 className="font-medium text-gray-700 mb-4">Technical Sub-Criteria</h4>
                        <div className="space-y-4">
                            {subCriteria.technical.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-gray-600 flex-1">{item.name}</span>
                                    <div className="flex items-center gap-2 w-24">
                                        <input
                                            type="number"
                                            value={item.weight}
                                            onChange={(e) => handleSubChange('technical', idx, 'weight', parseInt(e.target.value))}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                        />
                                        <span className="text-sm text-gray-500">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Commercial Sub-Criteria */}
                    <div>
                        <h4 className="font-medium text-gray-700 mb-4">Commercial Sub-Criteria</h4>
                        <div className="space-y-4">
                            {subCriteria.commercial.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-gray-600 flex-1">{item.name}</span>
                                    <div className="flex items-center gap-2 w-24">
                                        <input
                                            type="number"
                                            value={item.weight}
                                            onChange={(e) => handleSubChange('commercial', idx, 'weight', parseInt(e.target.value))}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                        />
                                        <span className="text-sm text-gray-500">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}


            {/* AI Recommendation */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-6 flex items-start gap-4 shadow-sm">
                <div className="p-3 bg-white rounded-full shadow-sm text-purple-600 mt-1">
                    <FaMagic size={20} />
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 mb-1">AI Recommendation</h4>
                    <p className="text-purple-800 text-sm mb-4">
                        For <strong>{data?.category || "this category"}</strong>, industry standards suggest a <strong>70% Technical / 30% Commercial</strong> split to ensure quality specifications are met before pricing considerations.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={generateCriteria}
                            disabled={isGenerating}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 shadow-sm transition"
                        >
                            {isGenerating ? "Generating..." : "Apply Suggestion"}
                        </button>
                        <button className="text-purple-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-100 transition">
                            Ignore
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
