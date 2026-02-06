"use client";

import { useEffect, useState } from "react";
import { FaMagic, FaCalendarAlt, FaUser, FaBuilding, FaMoneyBillWave, FaList, FaTag, FaPlus } from "react-icons/fa";
import Link from "next/link";

export default function TabOverview({ data, onUpdate, onAutoSave }: {
    data?: any,
    onUpdate?: (updates: any) => void,
    onAutoSave?: (updates: any) => void
}) {
    const [options, setOptions] = useState<any>({
        currencies: [],
        address: [], // Business Units logic
        customerCategories: [],
        users: [],
        suppliers: []
    });

    useEffect(() => {
        async function fetchOptions() {
            try {
                const res = await fetch("/api/options/brfq");
                if (res.ok) {
                    const opt = await res.json();
                    setOptions(opt);
                }
            } catch (err) {
                console.error("Failed to fetch options", err);
            }
        }
        fetchOptions();
    }, []);

    const handleChange = (field: string, value: any) => {
        if (onUpdate) {
            onUpdate({ [field]: value });
        }
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Form Fields Grid */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Event Title</label>
                            <input
                                type="text"
                                value={data?.title || ""}
                                onChange={(e) => handleChange("title", e.target.value)}
                                placeholder="e.g. F&B Supplies - Corporate Cafeteria 2025"
                                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Event Type</label>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none transition-all"
                                    value={data?.requestType || ""}
                                    onChange={(e) => handleChange("requestType", e.target.value)}
                                >
                                    <option value="" disabled>Select Type</option>
                                    <option value="RFP">Request for Proposal (RFP)</option>
                                    <option value="RFQ">Request for Quotation (RFQ)</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                                    <FaList />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-gray-700">Business Unit</label>
                            </div>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none transition-all"
                                    value={data?.address || ""}
                                    onChange={(e) => handleChange("address", e.target.value)}
                                >
                                    <option value="" disabled>Select Unit</option>
                                    {options.address && options.address.map((addr: any) => (
                                        <option key={addr.id} value={addr.id}>{addr.line1} {addr.city}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                                    <FaBuilding />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-gray-700">Category</label>
                            </div>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none transition-all"
                                    value={data?.category || ""}
                                    onChange={(e) => handleChange("category", e.target.value)}
                                >
                                    <option value="" disabled>Select Category</option>
                                    {options.customerCategories && options.customerCategories.map((cat: any) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                                    <FaTag />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-gray-700">Procurement Lead</label>
                            </div>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none transition-all"
                                    value={data?.procurementLeadId || ""}
                                    onChange={(e) => handleChange("procurementLeadId", e.target.value)}
                                >
                                    <option value="" disabled>Select Lead</option>
                                    {options.procurementLeads && options.procurementLeads.map((u: any) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                                    <FaUser />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-gray-700">Currency</label>
                            </div>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none transition-all"
                                    value={data?.additionalFields?.currency || "AED"}
                                    onChange={(e) => handleChange("additionalFields", { ...data.additionalFields, currency: e.target.value })}
                                >
                                    {options.currencies && options.currencies.map((curr: any) => (
                                        <option key={curr.id} value={curr.name}>{curr.name}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                                    <FaMoneyBillWave />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Publish Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={data?.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : ""}
                                    onChange={(e) => handleChange("createdAt", new Date(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                                    <FaCalendarAlt />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Bid Open</label>
                            <div className="relative group cursor-pointer">
                                <input
                                    type="date"
                                    value={data?.additionalFields?.bidOpenDate ? new Date(data.additionalFields.bidOpenDate).toISOString().split('T')[0] : ""}
                                    onChange={(e) => handleChange("additionalFields", { ...data.additionalFields, bidOpenDate: new Date(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer relative z-10 bg-transparent"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 pointer-events-none z-0">
                                    <FaCalendarAlt />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Bid Close</label>
                            <div className="relative group cursor-pointer">
                                <input
                                    type="date"
                                    value={data?.additionalFields?.bidCloseDate ? new Date(data.additionalFields.bidCloseDate).toISOString().split('T')[0] : ""}
                                    onChange={(e) => handleChange("additionalFields", { ...data.additionalFields, bidCloseDate: new Date(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer relative z-10 bg-transparent"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 pointer-events-none z-0">
                                    <FaCalendarAlt />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Clarification Deadline</label>
                            <div className="relative group cursor-pointer">
                                <input
                                    type="date"
                                    value={data?.additionalFields?.clarificationDate ? new Date(data.additionalFields.clarificationDate).toISOString().split('T')[0] : ""}
                                    onChange={(e) => handleChange("additionalFields", { ...data.additionalFields, clarificationDate: new Date(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer relative z-10 bg-transparent"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 pointer-events-none z-0">
                                    <FaCalendarAlt />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Suggestions Footer */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600 mt-1">
                        <FaMagic />
                    </div>
                    <div>
                        <h3 className="font-semibold text-purple-900 mb-2">AI Suggestions</h3>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-sm text-purple-800">
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                                Set bid close date to 21 days from now (industry standard for F&B)
                            </li>
                            <li className="flex items-center gap-2 text-sm text-purple-800">
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                                Add clarification deadline 7 days before bid close
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div >
    );
}
