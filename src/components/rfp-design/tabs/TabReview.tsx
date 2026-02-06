"use client";

import {
    FaCheckCircle, FaExclamationCircle, FaExternalLinkAlt, FaChevronDown, FaChevronUp,
    FaBox, FaTruck, FaFileContract, FaUserShield, FaClipboardList, FaInfoCircle, FaSpinner
} from "react-icons/fa";
import { useState } from "react";

export default function TabReview({ data, onUpdate }: { data?: any, onUpdate?: (updates: any) => void }) {
    // --- Validation Logic ---
    const validations = [
        {
            id: "basic",
            title: "Basic Information",
            isValid: !!data?.title && !!data?.procurementLeadId,
            error: "Missing Title or Lead"
        },
        {
            id: "items",
            title: "Scope & Items",
            isValid: data?.items?.length > 0,
            error: "No line items added"
        },
        {
            id: "suppliers",
            title: "Suppliers",
            isValid: data?.suppliers?.length > 0,
            warning: data?.suppliers?.length < 3 ? "Less than 3 suppliers" : null
        },
        {
            id: "approval",
            title: "Approval Workflow",
            isValid: data?.status !== "pending_approval" && data?.status !== "rejected",
            error: data?.status === "pending_approval" ? "Pending Approval" : (data?.status === "rejected" ? "Approval Rejected" : null)
        }
    ];

    const errorCount = validations.filter(v => !v.isValid).length;
    const warningCount = validations.filter(v => v.isValid && v.warning).length;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // data.id is needed. If data doesn't have ID, we can't submit.
            // Assuming data contains the procurement request ID as `id`.
            if (!data?.id) {
                alert("Error: Missing RFP ID");
                return;
            }

            // Determine action based on status
            const isApproved = data?.status === 'approved';
            const url = isApproved ? `/api/rfp/${data.id}/publish` : `/api/rfp/${data.id}/submit`;

            const res = await fetch(url, {
                method: 'POST'
            });
            const result = await res.json();

            if (res.ok) {
                setSubmitSuccess(true);
                if (isApproved) {
                    alert("Event Published! Invitation emails have been sent to suppliers.");
                    if (onUpdate) onUpdate({ status: "PUBLISHED" }); // Update local state
                } else {
                    alert("Submitted successfully! Approval workflow started.");
                    if (onUpdate) onUpdate({ status: "pending_approval" });
                }
            } else {
                alert((isApproved ? "Publishing" : "Submission") + " failed: " + result.error);
            }

        } catch (error) {
            console.error(error);
            alert("Network error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header / Validation Summary */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Review & Submit</h2>
                        <p className="text-sm text-gray-500 mt-1">Review all event details before submitting for approval.</p>
                    </div>
                    <div className="flex gap-3">
                        {errorCount > 0 ? (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-2">
                                <FaExclamationCircle /> {errorCount} Errors
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-2">
                                <FaCheckCircle /> Ready
                            </span>
                        )}
                        {warningCount > 0 && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium flex items-center gap-2">
                                <FaExclamationCircle /> {warningCount} Warnings
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Sections */}
            <ReviewSection
                title="Basic Information"
                icon={<FaInfoCircle />}
                isValid={!!data?.title}
            >
                <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                        <span className="block text-gray-500">Event Title</span>
                        <span className="font-medium text-gray-900">{data?.title || "-"}</span>
                    </div>
                    <div>
                        <span className="block text-gray-500">Request Type</span>
                        <span className="font-medium text-gray-900">{data?.requestType || "-"}</span>
                    </div>
                    <div>
                        <span className="block text-gray-500">Procurement Lead</span>
                        <span className="font-medium text-gray-900">{data?.procurementLeadId || "Unassigned"}</span> {/* Ideally verify name lookup */}
                    </div>
                    <div>
                        <span className="block text-gray-500">Target Value</span>
                        <span className="font-medium text-gray-900">{data?.additionalFields?.currency || "USD"} {data?.prValue || "-"}</span>
                    </div>
                    <div className="col-span-2">
                        <span className="block text-gray-500">SOW Summary</span>
                        <p className="text-gray-800 mt-1 bg-gray-50 p-3 rounded border border-gray-100">{data?.sowSummary || "No summary provided."}</p>
                    </div>
                </div>
            </ReviewSection>

            <ReviewSection
                title="Scope & Line Items"
                icon={<FaBox />}
                isValid={data?.items?.length > 0}
            >
                {data?.items?.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-2">Item</th>
                                    <th className="px-4 py-2">Qty</th>
                                    <th className="px-4 py-2">UOM</th>
                                    <th className="px-4 py-2">Location</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.items.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium text-gray-800">{item.title}</td>
                                        <td className="px-4 py-2">{item.quantity}</td>
                                        <td className="px-4 py-2 text-gray-500">{item.uom}</td>
                                        <td className="px-4 py-2 text-gray-500">{item.location || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No line items added yet.</p>
                )}
            </ReviewSection>

            <ReviewSection
                title="Suppliers"
                icon={<FaTruck />}
                isValid={data?.suppliers?.length > 0}
                warning={data?.suppliers?.length < 3 ? "Less than 3 suppliers" : null}
            >
                <div className="flex flex-wrap gap-3">
                    {data?.suppliers?.length > 0 ? (
                        data.suppliers.map((sup: any) => (
                            <div key={sup.id} className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 bg-white w-64 shadow-sm">
                                <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                                    {sup.companyName?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 text-sm truncate">{sup.companyName}</div>
                                    <div className="text-xs text-gray-500">{sup.contactEmail}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 italic">No suppliers invited.</p>
                    )}
                </div>
            </ReviewSection>

            <ReviewSection
                title="Evaluation & Scoring"
                icon={<FaClipboardList />}
                isValid={true}
            >
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Scoring Weights</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Technical</span>
                                <span className="font-medium">{data?.evaluationDetails?.weights?.technical || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${data?.evaluationDetails?.weights?.technical || 0}%` }}></div>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Commercial</span>
                                <span className="font-medium">{data?.evaluationDetails?.weights?.commercial || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${data?.evaluationDetails?.weights?.commercial || 0}%` }}></div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Team</h4>
                        <div className="space-y-2">
                            {data?.collaborators?.map((col: any) => (
                                <div key={col.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                        {col.name?.[0]}
                                    </div>
                                    <span className="text-gray-800">{col.name}</span>
                                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">{col.role}</span>
                                </div>
                            ))}
                            {(!data?.collaborators || data.collaborators.length === 0) && <span className="text-gray-500 italic text-sm">No team members added.</span>}
                        </div>
                    </div>
                </div>
            </ReviewSection>

            <ReviewSection
                title="Terms & Conditions"
                icon={<FaFileContract />}
                isValid={true}
            >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <span className="block text-xs text-gray-500 mb-1">Payment Terms</span>
                        <span className="font-medium text-gray-900">{data?.terms?.paymentTerms || "Standard"}</span>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <span className="block text-xs text-gray-500 mb-1">Incoterms</span>
                        <span className="font-medium text-gray-900">{data?.terms?.deliveryTerms || "-"}</span>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <span className="block text-xs text-gray-500 mb-1">Warranty</span>
                        <span className="font-medium text-gray-900">{data?.terms?.warrantyPeriod || "-"}</span>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <span className="block text-xs text-gray-500 mb-1">Contract Duration</span>
                        <span className="font-medium text-gray-900">{data?.terms?.contractDuration || "-"}</span>
                    </div>
                </div>
            </ReviewSection>

            <ReviewSection
                title="Approval Workflow"
                icon={<FaUserShield />}
                isValid={data?.status !== "pending_approval" && data?.status !== "rejected"}
                error={data?.status === "pending_approval" ? "Pending Approval" : (data?.status === "rejected" ? "Approval Rejected" : null)}
            >
                <div className="space-y-4">
                    {data?.approval?.steps?.map((step: any, idx: number) => (
                        <div key={step.id} className="flex items-start gap-3 relative">
                            {/* Connector Line */}
                            {idx !== data.approval.steps.length - 1 && (
                                <div className="absolute left-3.5 top-8 w-0.5 h-full bg-gray-200 -z-10"></div>
                            )}

                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-200 shadow-sm z-10">
                                {idx + 1}
                            </div>
                            <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-gray-900 text-sm">{step.role}</div>
                                    <div className="text-xs text-gray-500">{step.approverName || "Unassigned"}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {step.isRequired ? (
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 font-medium">Mandatory</span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-100">{step.condition || "Conditional"}</span>
                                    )}
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">{step.slaDuration}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!data?.approval?.steps || data.approval.steps.length === 0) && (
                        <p className="text-gray-500 italic text-sm">No approval steps configured.</p>
                    )}
                </div>
            </ReviewSection>

            {/* Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
                    <span className="text-sm text-gray-500">
                        {errorCount > 0
                            ? "Please resolve errors before submitting."
                            : "Ready for submission."}
                    </span>
                    <div className="flex gap-4">
                        <button className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
                            Preview
                        </button>
                        {data?.status === 'PUBLISHED' ? (
                            <span className="px-6 py-2 bg-green-100 text-green-700 font-medium rounded-lg border border-green-200 flex items-center gap-2">
                                <FaCheckCircle /> Event Published
                            </span>
                        ) : (
                            <button
                                disabled={errorCount > 0 || isSubmitting}
                                onClick={handleSubmit}
                                className={`px-6 py-2 rounded-lg font-medium shadow-md transition flex items-center gap-2 ${errorCount > 0 || isSubmitting ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"}`}
                            >
                                {isSubmitting ? <><FaSpinner className="animate-spin" /> {data?.status === 'approved' ? "Publishing..." : "Submitting..."}</> : (data?.status === 'approved' ? "Publish Event" : "Submit for Approval")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}

function ReviewSection({ title, icon, children, isValid = true, warning, error }: { title: string, icon: any, children: React.ReactNode, isValid?: boolean, warning?: string | null, error?: string | null }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className={`bg-white border ${isValid ? (warning ? 'border-orange-200' : 'border-gray-200') : 'border-red-300 ring-4 ring-red-50'} rounded-xl overflow-hidden shadow-sm transition-all`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition"
            >
                <div className="flex items-center gap-3">
                    <span className={`text-lg ${isValid ? (warning ? 'text-orange-500' : 'text-gray-400') : 'text-red-500'}`}>{icon}</span>
                    <h3 className={`font-semibold ${isValid ? 'text-gray-800' : 'text-red-700'}`}>{title}</h3>
                </div>
                <div className="flex items-center gap-3">
                    {!isValid && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">Incomplete</span>}
                    {warning && <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded flex items-center gap-1"><FaExclamationCircle /> {warning}</span>}
                    {isOpen ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
                </div>
            </button>

            {isOpen && (
                <div className="p-6">
                    {children}
                </div>
            )}
        </div>
    );
}
