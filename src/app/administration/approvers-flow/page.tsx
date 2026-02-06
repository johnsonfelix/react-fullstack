
"use client";
import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaClock, FaPlus, FaMagic, FaCog, FaExclamationTriangle, FaArrowDown, FaTrash, FaUserEdit, FaSave } from "react-icons/fa";
import { toast } from "sonner";

export default function WorkflowEditorPage() {
    const [steps, setSteps] = useState<any[]>([]);
    const [availableApprovers, setAvailableApprovers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Settings State
    const [settings, setSettings] = useState({
        defaultSla: "2 business days",
        allowParallel: false,
        sendReminders: true
    });

    useEffect(() => {
        // Fetch Available Approvers (Users)
        fetch('/api/approvers')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAvailableApprovers(data);
            })
            .catch(err => console.error(err));

        // Fetch Existing Template
        fetch('/api/administration/workflow-template')
            .then(res => res.json())
            .then(data => {
                if (data.steps) setSteps(data.steps);
                if (data.defaultSla) setSettings({
                    defaultSla: data.defaultSla,
                    allowParallel: data.allowParallel,
                    sendReminders: data.sendReminders
                });
            })
            .finally(() => setIsLoading(false));
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/administration/workflow-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    steps,
                    ...settings
                })
            });

            if (res.ok) {
                toast.success("Workflow template saved successfully");
            } else {
                toast.error("Failed to save template");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddStep = () => {
        const newStep = {
            role: "New Approver",
            approverName: "",
            slaDuration: settings.defaultSla,
            condition: "",
            conditionType: "",
            conditionOperator: "",
            conditionValue: "",
            isRequired: true,
            order: steps.length + 1
        };
        setSteps([...steps, newStep]);
    };

    const handleDeleteStep = (index: number) => {
        if (!confirm("Remove this step?")) return;
        setSteps(steps.filter((_, i) => i !== index));
    };

    const handleUpdateStep = (index: number, updatedStep: any) => {
        const newSteps = [...steps];
        newSteps[index] = updatedStep;
        setSteps(newSteps);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Approval Workflow Template</h1>
                    <p className="text-gray-500 mt-1">Define the master approval flow for all RFPs.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium disabled:opacity-50"
                >
                    <FaSave /> {isSaving ? "Saving..." : "Save Configuration"}
                </button>
            </div>

            {isLoading ? <div className="p-10 text-center">Loading...</div> : (
                <>
                    {/* Workflow Editor Area (Reused from TabApprovals logic) */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 min-h-[400px]">
                        {steps.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <p className="mb-4">No approval steps defined.</p>
                                <button onClick={handleAddStep} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                                    Create First Step
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-0 relative">
                                <div className="absolute left-[28px] top-4 bottom-4 w-0.5 bg-gray-100 z-0" />
                                {steps.map((step, i) => (
                                    <div key={i} className="relative z-10 group">
                                        <ApprovalStepRow
                                            step={step}
                                            index={i}
                                            availableApprovers={availableApprovers}
                                            onDelete={() => handleDeleteStep(i)}
                                            onUpdate={(updatedStep) => handleUpdateStep(i, updatedStep)}
                                        />
                                        {i < steps.length - 1 && (
                                            <div className="pl-14 py-2 opacity-50">
                                                <FaArrowDown className="text-gray-300 text-xs" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handleAddStep} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium text-sm">
                            <FaPlus /> Add Step
                        </button>
                    </div>

                    {/* Settings */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                            <FaCog /> Global Settings
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Default SLA</label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        value={settings.defaultSla}
                                        onChange={e => setSettings({ ...settings, defaultSla: e.target.value })}
                                    >
                                        <option>1 business day</option>
                                        <option>2 business days</option>
                                        <option>3 business days</option>
                                        <option>1 week</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        className="mt-1"
                                        checked={settings.allowParallel}
                                        onChange={e => setSettings({ ...settings, allowParallel: e.target.checked })}
                                    />
                                    <div className="text-sm">
                                        <span className="font-medium text-gray-800 block">Allow parallel approvals</span>
                                        <span className="text-gray-500">Approvers can review simultaneously</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Reusing the Step Component Logic (Inline for simplicity or import if refactored)
function ApprovalStepRow({ step, index, onDelete, onUpdate, availableApprovers = [] }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(step);

    useEffect(() => setEditForm(step), [step]);

    const handleSave = () => {
        let displayCondition = editForm.condition || (editForm.isRequired ? "Always required" : "Optional");
        if (editForm.conditionType && editForm.conditionOperator && editForm.conditionValue) {
            displayCondition = `${editForm.conditionType} ${editForm.conditionOperator} ${editForm.conditionValue}`;
        }

        onUpdate({ ...editForm, condition: displayCondition });
        setIsEditing(false);
    };

    return (
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-14 flex justify-center pt-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-sm z-10 shadow-sm">
                    {index + 1}
                </div>
            </div>

            <div className={`flex-1 bg-white border ${isEditing ? 'border-blue-400 ring-4 ring-blue-50' : 'border-gray-200'} rounded-lg p-4 shadow-sm hover:shadow-md transition-all relative`}>
                {isEditing ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
                                <input
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                    value={editForm.role}
                                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Approver Name</label>
                                <select
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                    value={editForm.approverName || ""}
                                    onChange={e => {
                                        const sel = availableApprovers.find((a: any) => a.name === e.target.value);
                                        setEditForm({ ...editForm, approverName: e.target.value, role: sel?.role || editForm.role })
                                    }}
                                >
                                    <option value="">Unassigned</option>
                                    {availableApprovers.map((a: any) => (
                                        <option key={a.id} value={a.name}>{a.name} ({a.role})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {/* Simplified Condition Editor */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                <select className="border rounded p-1 text-sm" value={editForm.conditionType} onChange={e => setEditForm({ ...editForm, conditionType: e.target.value })}>
                                    <option value="">Condition Type</option>
                                    <option value="Budget">Budget</option>
                                </select>
                                <select className="border rounded p-1 text-sm" value={editForm.conditionOperator} onChange={e => setEditForm({ ...editForm, conditionOperator: e.target.value })}>
                                    <option value="">Operator</option>
                                    <option value=">">{'>'}</option>
                                </select>
                                <input className="border rounded p-1 text-sm" placeholder="Value" value={editForm.conditionValue} onChange={e => setEditForm({ ...editForm, conditionValue: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={editForm.isRequired} onChange={e => setEditForm({ ...editForm, isRequired: e.target.checked })} />
                                Mandatory
                            </label>
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs text-gray-600">Cancel</button>
                                <button onClick={handleSave} className="px-3 py-1 text-xs bg-blue-600 text-white rounded">Save</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-between items-start cursor-pointer -m-4 p-4" onClick={() => setIsEditing(true)}>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                <FaUserEdit />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800 text-sm">{step.role}</h4>
                                <div className="text-sm text-gray-600">{step.approverName || "Unassigned"}</div>
                                <div className="text-xs text-gray-500 mt-1">{step.isRequired ? "Required" : step.condition}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-gray-300 hover:text-red-500 p-1"><FaTrash /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
