"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AiAssistDrawer from "./AiAssistDrawer";
import EventSummaryWidget from "./EventSummaryWidget";
import { FaMagic, FaSave, FaTimes, FaCalendarAlt, FaChevronDown } from "react-icons/fa";

// Tab Components
import TabOverview from "./tabs/TabOverview";
import TabScope from "./tabs/TabScope";
import TabSuppliers from "./tabs/TabSuppliers";
import TabEvaluation from "./tabs/TabEvaluation";
import TabQuestionnaire from "./tabs/TabQuestionnaire";
import TabTerms from "./tabs/TabTerms";
import TabAttachments from "./tabs/TabAttachments";
import TabReview from "./tabs/TabReview";
import TabCollaboration from "./tabs/TabCollaboration";
import TabApprovals from "./tabs/TabApprovals";
import TabResponses from "./tabs/TabResponses";

const TABS = [
    { id: "overview", label: "Overview", component: TabOverview },
    { id: "scope", label: "Scope & Items", component: TabScope },
    { id: "suppliers", label: "Suppliers", component: TabSuppliers },
    { id: "evaluation", label: "Evaluation", component: TabEvaluation },
    { id: "questionnaire", label: "Questionnaire", component: TabQuestionnaire },
    { id: "terms", label: "Terms", component: TabTerms },
    { id: "attachments", label: "Attachments", component: TabAttachments },
    { id: "review", label: "Review", component: TabReview },
    { id: "collaboration", label: "Collaboration", component: TabCollaboration },
    { id: "approvals", label: "Approvals", component: TabApprovals },
    { id: "responses", label: "Responses", component: TabResponses },
];

export default function RfpEventLayout({ procurement: initialProcurement }: { procurement?: any }) {
    const [procurement, setProcurement] = useState(initialProcurement || {});
    const [activeTab, setActiveTab] = useState("overview");
    const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const router = useRouter();

    // Handler to update local state from tabs
    const handleUpdate = (updates: any) => {
        setProcurement((prev: any) => ({ ...prev, ...updates }));
    };

    // Internal helper to save data to DB
    const saveToDb = async (dataToSave: any) => {
        const isNew = !dataToSave.id;
        const url = isNew ? "/api/procurement/create" : `/api/procurement/${dataToSave.id}`;
        const method = isNew ? "POST" : "PATCH";

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dataToSave),
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Failed to save");
        }

        return await res.json();
    };

    // Auto-save handler for immediate persistence (e.g. attachments)
    const handleAutoSave = async (updates: any) => {
        // 1. Optimistic update
        const updatedProcurement = { ...procurement, ...updates };
        setProcurement(updatedProcurement);

        // 2. Save only if we have an ID (edit mode) or enough info to create
        // For simplicity, we only auto-save if the record exists to avoid accidental creation validation errors
        if (!procurement.id) {
            console.log("Skipping auto-save: No ID yet");
            return;
        }

        setIsSaving(true);
        try {
            await saveToDb(updatedProcurement);
            // distinct visual feedback for auto-save could go here
        } catch (err) {
            console.error("Auto-save failed:", err);
        } finally {
            setIsSaving(false);
        }
    };

    // Manual Save Button Handler
    const handleSave = async () => {
        // Validation for creation
        if (!procurement.id) {
            if (!procurement.title || !procurement.requestType || !procurement.category || !procurement.address) {
                alert("Please fill in Event Title, Type, Category, and Business Unit to save.");
                return;
            }
        }

        setIsSaving(true);
        try {
            const savedData = await saveToDb(procurement);

            if (!procurement.id) { // Was new
                alert("Event created successfully!");
                router.push(`/buyer/rfp/${savedData.id}`);
            } else {
                setProcurement(savedData);
                alert("Changes saved successfully!");
            }
        } catch (err: any) {
            console.error(err);
            alert(`Error: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component || TabOverview;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">


            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Content */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* Event Header + Tabs (Frame 3) */}
                    <div className="bg-white border-b border-gray-200 px-8 pt-6">
                        {/* Event Fields - Simplified for Header */}
                        <div className="grid grid-cols-12 gap-6 mb-8">
                            <div className="col-span-12 md:col-span-6 space-y-4">
                                <input
                                    type="text"
                                    placeholder="Event Title"
                                    className="w-full text-lg font-semibold border-b border-gray-300 hover:border-blue-500 focus:border-blue-500 focus:outline-none px-1 py-2 bg-transparent transition-colors"
                                    defaultValue={procurement?.title || ""}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <select className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                                        <option>RFP (Request for Proposal)</option>
                                        <option>RFQ (Request for Quotation)</option>
                                        <option>RFI (Request for Information)</option>
                                    </select>
                                    <select className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                                        <option>Marketing</option>
                                        <option>IT Hardware</option>
                                        <option>Professional Services</option>
                                    </select>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-6 flex justify-end gap-6 items-start">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    <FaSave /> {isSaving ? "Saving..." : "Save Draft"}
                                </button>
                                {/* AI Suggestion Placeholder - Only show if data exists */}
                                {procurement?.aiSuggestion && (
                                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 max-w-sm">
                                        <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
                                            <FaMagic /> AI Suggestion
                                        </div>
                                        <p className="text-sm text-blue-800 mb-3">
                                            {procurement.aiSuggestion}
                                        </p>
                                        <div className="flex gap-2">
                                            <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition">Apply</button>
                                            <button className="text-xs text-blue-600 hover:text-blue-800 transition">Review</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex items-center overflow-x-auto no-scrollbar gap-1">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                    whitespace-nowrap px-4 py-3 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                                            ? "border-blue-600 text-blue-600 bg-blue-50/50"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}
                  `}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
                        <div className="max-w-7xl mx-auto">
                            <ActiveComponent
                                data={procurement}
                                onUpdate={handleUpdate}
                                onAutoSave={handleAutoSave}
                            />
                        </div>
                    </div>
                </div>

                {/* Event Summary Widget (Hidden on small screens, visible on large) */}
                <EventSummaryWidget data={procurement} />

                {/* AI Assist Drawer */}
                <AiAssistDrawer isOpen={isAiDrawerOpen} onClose={() => setIsAiDrawerOpen(false)} data={procurement} />
            </div>
        </div>
    );
}
