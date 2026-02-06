
import { useState, useEffect } from "react";
import { FaCheckCircle, FaClock, FaArrowDown, FaUser, FaInfoCircle } from "react-icons/fa";

export default function TabApprovals({ data }: { data?: any }) {
    const approvalData = data?.approval || {};
    const steps = approvalData.steps || [];
    const [templatePreview, setTemplatePreview] = useState<any[]>([]);
    const [loadingTemplate, setLoadingTemplate] = useState(false);

    useEffect(() => {
        // If no steps exist, fetch template to show what WILL happen
        if (steps.length === 0) {
            setLoadingTemplate(true);
            fetch('/api/administration/workflow-template')
                .then(res => res.json())
                .then(data => {
                    if (data.steps) setTemplatePreview(data.steps);
                })
                .catch(err => console.error("Failed to load template preview", err))
                .finally(() => setLoadingTemplate(false));
        }
    }, [steps.length]);

    const displaySteps = steps.length > 0 ? steps : templatePreview;
    const isPreview = steps.length === 0;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">

            {/* Header / Title */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Approval Workflow</h2>
                    <p className="text-sm text-gray-500">
                        {isPreview
                            ? "This RFP will follow the standard approval workflow defined by potential administrators."
                            : "Current status of the approval workflow for this RFP."}
                    </p>
                </div>
                {isPreview && (
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded text-xs font-medium border border-blue-100 flex items-center gap-2">
                        <FaInfoCircle /> Workflow Preview
                    </div>
                )}
            </div>

            {/* Workflow Timeline */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 min-h-[400px]">
                {loadingTemplate ? (
                    <div className="text-center py-10 text-gray-500">Loading workflow...</div>
                ) : displaySteps.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="mb-4">No approval workflow defined by administrator.</p>
                    </div>
                ) : (
                    <div className="space-y-0 relative">
                        {/* Vertical Line Background */}
                        <div className="absolute left-[28px] top-4 bottom-4 w-0.5 bg-gray-100 z-0" />

                        {displaySteps.map((step: any, i: number) => (
                            <div key={i} className="relative z-10 group">
                                <ApprovalStepRow
                                    step={step}
                                    index={i}
                                    isPreview={isPreview}
                                />
                                {i < displaySteps.length - 1 && (
                                    <div className="pl-14 py-2 opacity-50">
                                        <FaArrowDown className="text-gray-300 text-xs" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ApprovalStepRow({ step, index, isPreview }: { step: any, index: number, isPreview: boolean }) {

    // Status Logic
    const getStatusColor = (s: string) => {
        if (isPreview) return "bg-gray-50 text-gray-500 border-gray-200"; // Preview is always gray
        switch (s) {
            case "APPROVED": return "bg-green-100 text-green-700 border-green-200";
            case "PENDING": return "bg-blue-100 text-blue-700 border-blue-200";
            case "REJECTED": return "bg-red-100 text-red-700 border-red-200";
            case "CONDITIONAL": return "bg-yellow-100 text-yellow-700 border-yellow-200";
            default: return "bg-gray-50 text-gray-500 border-gray-200";
        }
    };

    const getStatusLabel = (s: string) => {
        if (isPreview) return "Scheduled";
        if (s === "PENDING") return "Waiting for Approval";
        return s.charAt(0) + s.slice(1).toLowerCase();
    }

    return (
        <div className="flex items-start gap-4">
            {/* Step Number Badge */}
            <div className="flex-shrink-0 w-14 flex justify-center pt-2">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm z-10 shadow-sm ${step.status === 'APPROVED' ? 'bg-green-500 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                    {step.status === 'APPROVED' ? <FaCheckCircle /> : index + 1}
                </div>
            </div>

            {/* Content Card */}
            <div className={`flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm relative`}>
                <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <FaUser />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                {step.role}
                            </h4>
                            <div className="text-sm text-gray-600">{step.approverName || "Unassigned"}</div>

                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                {step.slaDuration && (
                                    <span className="flex items-center gap-1"><FaClock className="text-gray-400" /> SLA: {step.slaDuration}</span>
                                )}
                                {step.condition && (
                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">{step.condition}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(step.status)}`}>
                            {getStatusLabel(step.status)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
