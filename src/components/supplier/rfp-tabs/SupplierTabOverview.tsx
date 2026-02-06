
"use client";

import { FaCalendarAlt, FaMapMarkerAlt, FaTag, FaUser, FaCheckCircle } from "react-icons/fa";


// Helper to format camelCase to Title Case
const formatKey = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateString;
    }
};

// Recursive component to render generic objects as a clean list
const RecursiveRenderer = ({ data, level = 0 }: { data: any, level?: number }) => {
    if (data === null || data === undefined) return <span className="text-gray-400 italic">N/A</span>;

    if (typeof data !== 'object') {
        const strVal = String(data);
        // Check if string looks like an ISO date
        if (/^\d{4}-\d{2}-\d{2}T/.test(strVal)) {
            return <span className="text-gray-900 font-medium bg-blue-50 px-2 py-0.5 rounded text-sm">{formatDate(strVal)}</span>;
        }
        return <span className="text-gray-700 font-medium">{strVal}</span>;
    }

    if (Array.isArray(data)) {
        return (
            <div className="space-y-2">
                {data.map((item, idx) => (
                    <div key={idx} className="pl-4 border-l-2 border-gray-100">
                        <RecursiveRenderer data={item} level={level + 1} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${level > 0 ? 'mt-2' : ''}`}>
            {Object.entries(data).map(([key, value], idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                    <div className="min-w-[150px] text-sm text-gray-500 font-medium pt-0.5">
                        {formatKey(key)}
                    </div>
                    <div className="flex-1 text-sm">
                        <RecursiveRenderer data={value} level={level + 1} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function SupplierTabOverview({ data }: { data: any }) {
    return (
        <div className="space-y-8">
            {/* Header / Summary */}
            <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><FaTag size={14} /></span>
                    Event Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 bg-gray-50 p-2 rounded-lg text-gray-500"><FaTag /></div>
                            <div>
                                <span className="block text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1">Event Type</span>
                                <span className="font-medium text-gray-900 text-lg">{data.requestType || "N/A"}</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="mt-1 bg-gray-50 p-2 rounded-lg text-gray-500"><FaCalendarAlt /></div>
                            <div>
                                <span className="block text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1">Published Date</span>
                                <span className="font-medium text-gray-900 text-lg">{new Date(data.updatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 bg-gray-50 p-2 rounded-lg text-gray-500"><FaMapMarkerAlt /></div>
                            <div>
                                <span className="block text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1">Delivery Location</span>
                                <span className="font-medium text-gray-900 text-lg">{data.address || "See Items for details"}</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="mt-1 bg-gray-50 p-2 rounded-lg text-gray-500"><FaUser /></div>
                            <div>
                                <span className="block text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1">Buyer</span>
                                <span className="font-medium text-gray-900 text-lg">Procurement Team</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description / SOW */}
            <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                <h2 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Scope of Work & Description</h2>

                <div className="space-y-8">
                    {/* SOW Summary */}
                    {data.sowSummary && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">SOW Summary</h3>
                            <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 text-gray-700 leading-relaxed">
                                {data.sowSummary}
                            </div>
                        </div>
                    )}

                    {/* Description (Legacy/Fallback or Additional) */}
                    {data.description && (
                        <div>
                            <h3 className={`text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 ${data.sowSummary ? 'mt-6' : ''}`}>Description</h3>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{data.description}</p>
                        </div>
                    )}

                    {/* Deliverables */}
                    {data.deliverables && Array.isArray(data.deliverables) && data.deliverables.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Deliverables</h3>
                            <div className="grid gap-3">
                                {data.deliverables.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-3 bg-white border border-gray-100 p-4 rounded-lg shadow-sm">
                                        <div className="mt-0.5 text-blue-600"><FaCheckCircle /></div>
                                        <span className="text-gray-700 font-medium">{typeof item === 'string' ? item : item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!data.sowSummary && !data.description && (!data.deliverables || data.deliverables.length === 0) && (
                        <p className="text-gray-500 italic">No detailed scope of work provided.</p>
                    )}
                </div>
            </div>

            {/* Additional Info / Terms Summary */}
            <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                <h2 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Terms & Conditions Summary</h2>
                {data.additionalFields && Object.keys(data.additionalFields).length > 0 ? (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                        <RecursiveRenderer data={data.additionalFields} />
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No additional terms specified.</p>
                )}
            </div>
        </div>
    );
}
