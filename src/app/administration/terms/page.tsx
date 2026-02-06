"use client";

import { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaSpinner } from "react-icons/fa";

const OPTION_TYPES = [
    { key: "payment", label: "Payment Terms" },
    { key: "incoterms", label: "Incoterms" },
    { key: "contractTemplate", label: "Contract Templates" },
    { key: "contractDuration", label: "Contract Durations" },
    { key: "warrantyPeriod", label: "Warranty Periods" },
    { key: "governingLaw", label: "Governing Laws" },
    { key: "jurisdiction", label: "Jurisdictions" },
];

export default function TermsAdministrationPage() {
    const [activeTab, setActiveTab] = useState(OPTION_TYPES[0].key);
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newValue, setNewValue] = useState("");
    const [adding, setAdding] = useState(false);

    const fetchOptions = async (type: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/administration/options?type=${type}`);
            if (res.ok) {
                const data = await res.json();
                setOptions(data);
            }
        } catch (error) {
            console.error("Failed to fetch options", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOptions(activeTab);
    }, [activeTab]);

    const handleAdd = async () => {
        if (!newValue.trim()) return;
        setAdding(true);
        try {
            const res = await fetch("/api/administration/options", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: activeTab, name: newValue }),
            });
            if (res.ok) {
                setNewValue("");
                fetchOptions(activeTab);
            }
        } catch (error) {
            console.error("Failed to add option", error);
        }
        setAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this option?")) return;
        try {
            await fetch(`/api/administration/options?type=${activeTab}&id=${id}`, {
                method: "DELETE",
            });
            fetchOptions(activeTab);
        } catch (error) {
            console.error("Failed to delete option", error);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Terms Configuration</h1>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar / Tabs */}
                <div className="w-full lg:w-64 space-y-1">
                    {OPTION_TYPES.map((type) => (
                        <button
                            key={type.key}
                            onClick={() => setActiveTab(type.key)}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === type.key
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-6 min-h-[500px]">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-2">
                        Manage {OPTION_TYPES.find(t => t.key === activeTab)?.label}
                    </h2>

                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                            placeholder={`Add new ${OPTION_TYPES.find(t => t.key === activeTab)?.label.slice(0, -1)}...`}
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={adding || !newValue.trim()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {adding ? <FaSpinner className="animate-spin" /> : <FaPlus />} Add
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <FaSpinner className="animate-spin text-blue-500 text-2xl" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {options.map((option) => (
                                <div key={option.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                                    <span className="text-gray-700 font-medium">{option.name}</span>
                                    <button
                                        onClick={() => handleDelete(option.id)}
                                        className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete"
                                    >
                                        <FaTrash size={14} />
                                    </button>
                                </div>
                            ))}
                            {options.length === 0 && (
                                <p className="text-gray-400 text-center py-8 text-sm">No options found. Add one above.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
