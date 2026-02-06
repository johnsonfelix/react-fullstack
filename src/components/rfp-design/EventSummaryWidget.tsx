"use client";

import { FaMoneyBillWave, FaCubes, FaUsers, FaExclamationTriangle, FaUserCircle } from "react-icons/fa";

export default function EventSummaryWidget({ data }: { data?: any }) {
    if (!data) return null;

    // Derived values
    const currency = data?.additionalFields?.currency || "USD";
    const budget = data?.prValue ? `${currency} ${parseInt(data.prValue).toLocaleString()}` : "-";
    const complexity = data?.additionalFields?.complexity || "Low";
    const riskScore = data?.additionalFields?.riskScore || "Low";
    const suppliersCount = data?.suppliers?.length || 0;
    const activeSuppliers = data?.suppliers?.filter((s: any) => s.status === 'active')?.length || 0;
    const pendingSuppliers = data?.suppliers?.filter((s: any) => s.status === 'pending' || !s.status)?.length || 0;
    const ownerName = data?.procurementLead?.name || "Unassigned";

    return (
        <div className="w-80 bg-white border-l border-gray-200 hidden 2xl:flex flex-col h-full shadow-sm">
            <div className="p-5 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Event Summary</h3>
                <p className="text-xs text-gray-500">ID: {data.id?.substring(0, 8) || "New"}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">

                {/* Status */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-500">Status</span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase">{data.status || "Draft"}</span>
                    </div>
                </div>

                {/* Budget & Complexity Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="text-gray-400 mb-1">
                            <FaMoneyBillWave size={14} />
                        </div>
                        <div className="text-xs text-gray-500">Est. Budget</div>
                        <div className="font-bold text-gray-900 text-sm truncate" title={budget}>{budget}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="text-gray-400 mb-1">
                            <FaCubes size={14} />
                        </div>
                        <div className="text-xs text-gray-500">Complexity</div>
                        <div className="font-bold text-gray-900">{complexity}</div>
                    </div>
                </div>

                {/* Suppliers */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Suppliers</h4>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <FaUsers />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900">{suppliersCount} Selected</div>
                            <div className="text-xs text-gray-500">{activeSuppliers} Active, {pendingSuppliers} Pending</div>
                        </div>
                    </div>
                </div>

                {/* Risk Score */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-xl border border-orange-100">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-orange-900 text-sm">Risk Score</h4>
                        <FaExclamationTriangle className="text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-orange-800 mb-1">{riskScore}</div>
                    <p className="text-xs text-orange-700">Standard category risk.</p>
                </div>

                {/* Owner */}
                <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            {ownerName !== "Unassigned" ? ownerName.charAt(0).toUpperCase() : <FaUserCircle />}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-900">{ownerName}</div>
                            <div className="text-xs text-gray-500">Owner</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
