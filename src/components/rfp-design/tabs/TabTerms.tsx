"use client";

import { Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

export default function TabTerms({ data, onUpdate }: { data?: any, onUpdate?: (updates: any) => void }) {
    const [options, setOptions] = useState<{
        payment: any[];
        incoterms: any[];
        contractTemplate: any[];
        contractDuration: any[];
        warrantyPeriod: any[];
        governingLaw: any[];
        jurisdiction: any[];
    }>({
        payment: [],
        incoterms: [],
        contractTemplate: [],
        contractDuration: [],
        warrantyPeriod: [],
        governingLaw: [],
        jurisdiction: []
    });

    useEffect(() => {
        const fetchAllOptions = async () => {
            try {
                const [payment, incoterms, contractTemplate, contractDuration, warrantyPeriod, governingLaw, jurisdiction] = await Promise.all([
                    fetch('/api/administration/options?type=payment').then(res => res.json()),
                    fetch('/api/administration/options?type=incoterms').then(res => res.json()),
                    fetch('/api/administration/options?type=contractTemplate').then(res => res.json()),
                    fetch('/api/administration/options?type=contractDuration').then(res => res.json()),
                    fetch('/api/administration/options?type=warrantyPeriod').then(res => res.json()),
                    fetch('/api/administration/options?type=governingLaw').then(res => res.json()),
                    fetch('/api/administration/options?type=jurisdiction').then(res => res.json())
                ]);
                setOptions({
                    payment: Array.isArray(payment) ? payment : [],
                    incoterms: Array.isArray(incoterms) ? incoterms : [],
                    contractTemplate: Array.isArray(contractTemplate) ? contractTemplate : [],
                    contractDuration: Array.isArray(contractDuration) ? contractDuration : [],
                    warrantyPeriod: Array.isArray(warrantyPeriod) ? warrantyPeriod : [],
                    governingLaw: Array.isArray(governingLaw) ? governingLaw : [],
                    jurisdiction: Array.isArray(jurisdiction) ? jurisdiction : []
                });
            } catch (error) {
                console.error("Failed to fetch terms options", error);
            }
        };

        fetchAllOptions();
    }, []);

    const updateTerm = (field: string, value: any) => {
        const currentTerms = data?.terms || {};
        const updatedTerms = { ...currentTerms, [field]: value };
        if (onUpdate) onUpdate({ terms: updatedTerms });
    };

    const toggleClause = (clause: string, checked: boolean) => {
        const currentTerms = data?.terms || {};
        const currentClauses = Array.isArray(currentTerms.additionalClauses) ? currentTerms.additionalClauses : [];

        let updatedClauses;
        if (checked) {
            updatedClauses = [...currentClauses, clause];
        } else {
            updatedClauses = currentClauses.filter((c: string) => c !== clause);
        }

        updateTerm("additionalClauses", updatedClauses);
    };

    const handleApplyRecommendations = () => {
        const newTerms = { ...(data?.terms || {}) };

        // 1. Payment: Net 30
        const net30 = options.payment.find(p => p.name.toLowerCase().includes("net 30"));
        if (net30) newTerms.paymentTerms = net30.name;

        // 2. Incoterms: DDP
        const ddp = options.incoterms.find(i => i.name.toLowerCase().includes("ddp"));
        if (ddp) newTerms.deliveryTerms = ddp.name;

        // 3. Duration: 12 Months
        const duration = options.contractDuration.find(d => d.name.includes("12") || d.name.toLowerCase().includes("1 year"));
        if (duration) newTerms.contractDuration = duration.name;

        // 4. Force Majeure
        const clauses = Array.isArray(newTerms.additionalClauses) ? [...newTerms.additionalClauses] : [];
        if (!clauses.includes("Force Majeure")) {
            clauses.push("Force Majeure");
        }
        newTerms.additionalClauses = clauses;

        if (onUpdate) onUpdate({ terms: newTerms });
    };

    return (
        <div className="space-y-6 h-[calc(100vh-280px)] overflow-y-auto pr-2">
            {/* Terms Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="mb-6 font-semibold text-lg text-gray-800">Terms & Conditions</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 text-gray-700 font-medium text-sm">Payment Terms</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            value={data?.terms?.paymentTerms || ""}
                            onChange={(e) => updateTerm("paymentTerms", e.target.value)}
                        >
                            <option value="">Select option...</option>
                            {options.payment.map(opt => (
                                <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 text-gray-700 font-medium text-sm">Delivery Terms (Incoterms)</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            value={data?.terms?.deliveryTerms || ""}
                            onChange={(e) => updateTerm("deliveryTerms", e.target.value)}
                        >
                            <option value="">Select option...</option>
                            {options.incoterms.map(opt => (
                                <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 text-gray-700 font-medium text-sm">Contract Template</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            value={data?.terms?.contractTemplate || ""}
                            onChange={(e) => updateTerm("contractTemplate", e.target.value)}
                        >
                            <option value="">Select option...</option>
                            {options.contractTemplate.map(opt => (
                                <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                checked={!!data?.terms?.ndaRequired}
                                onChange={(e) => updateTerm("ndaRequired", e.target.checked)}
                            />
                            <div>
                                <span className="text-gray-700 font-medium text-sm">NDA Required</span>
                                <p className="text-gray-500 text-xs">Suppliers must sign a non-disclosure agreement</p>
                            </div>
                        </label>
                    </div>

                    <div>
                        <label className="block mb-2 text-gray-700 font-medium text-sm">Contract Duration</label>
                        <div className="grid grid-cols-2 gap-4">
                            <select
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                value={data?.terms?.contractDuration || ""}
                                onChange={(e) => updateTerm("contractDuration", e.target.value)}
                            >
                                <option value="">Select duration...</option>
                                {options.contractDuration.map(opt => (
                                    <option key={opt.id} value={opt.name}>{opt.name}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    checked={!!data?.terms?.autoRenewal}
                                    onChange={(e) => updateTerm("autoRenewal", e.target.checked)}
                                />
                                <span className="text-gray-700 text-sm">Auto-renewal option</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block mb-2 text-gray-700 font-medium text-sm">Warranty Period</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            value={data?.terms?.warrantyPeriod || ""}
                            onChange={(e) => updateTerm("warrantyPeriod", e.target.value)}
                        >
                            <option value="">Select period...</option>
                            {options.warrantyPeriod.map(opt => (
                                <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 text-gray-700 font-medium text-sm">Liquidated Damages</label>
                        <textarea
                            placeholder="Specify penalties for non-performance"
                            className="w-full min-h-24 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            rows={3}
                            value={data?.terms?.liquidatedDamages || ""}
                            onChange={(e) => updateTerm("liquidatedDamages", e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* AI Suggestion */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
                <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-600 mt-1" />
                    <div className="flex-1">
                        <h3 className="mb-2 text-purple-900 font-medium">AI Suggestion</h3>
                        <p className="text-gray-700 mb-4 text-sm">
                            Recommended contractual terms based on F&B category best practices:
                        </p>
                        <ul className="space-y-2 mb-4 text-sm">
                            <li className="flex gap-2 text-gray-700">
                                <span className="text-purple-600">•</span>
                                <span>Net 30 payment terms are standard for fresh food suppliers</span>
                            </li>
                            <li className="flex gap-2 text-gray-700">
                                <span className="text-purple-600">•</span>
                                <span>DDP delivery recommended to ensure quality control up to delivery point</span>
                            </li>
                            <li className="flex gap-2 text-gray-700">
                                <span className="text-purple-600">•</span>
                                <span>12-month contract with quarterly review clauses for price adjustments</span>
                            </li>
                            <li className="flex gap-2 text-gray-700">
                                <span className="text-purple-600">•</span>
                                <span>Include force majeure clause for supply chain disruptions</span>
                            </li>
                        </ul>
                        <button
                            onClick={handleApplyRecommendations}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                            Apply Recommendations
                        </button>
                    </div>
                </div>
            </div>

            {/* Additional Clauses */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="mb-4 font-semibold text-lg text-gray-800">Additional Clauses</h3>

                <div className="space-y-3">
                    {[
                        'Force Majeure',
                        'Dispute Resolution',
                        'Termination Rights',
                        'Confidentiality',
                        'Insurance Requirements',
                        'Compliance with Laws',
                    ].map((clause, index) => (
                        <label key={index} className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                checked={data?.terms?.additionalClauses?.includes(clause) || false}
                                onChange={(e) => toggleClause(clause, e.target.checked)}
                            />
                            <span className="text-gray-700 text-sm">{clause}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Governing Law */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="mb-4 font-semibold text-lg text-gray-800">Legal Framework</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 text-gray-700 font-medium text-sm">Governing Law</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            value={data?.terms?.governingLaw || ""}
                            onChange={(e) => updateTerm("governingLaw", e.target.value)}
                        >
                            <option value="">Select option...</option>
                            {options.governingLaw.map(opt => (
                                <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 text-gray-700 font-medium text-sm">Jurisdiction</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            value={data?.terms?.jurisdiction || ""}
                            onChange={(e) => updateTerm("jurisdiction", e.target.value)}
                        >
                            <option value="">Select option...</option>
                            {options.jurisdiction.map(opt => (
                                <option key={opt.id} value={opt.name}>{opt.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
