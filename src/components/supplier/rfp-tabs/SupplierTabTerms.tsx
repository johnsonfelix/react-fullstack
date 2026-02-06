
"use client";

import { FaFileContract } from "react-icons/fa";


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

export default function SupplierTabTerms({ data }: { data: any }) {
    // Determine how terms are stored. 'terms' could be JSON or string
    const terms = data.terms;

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-8 lg:p-12 shadow-sm transition-shadow duration-300 min-h-[500px]">
            <div className="border-b border-gray-100 pb-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <FaFileContract size={24} />
                    </div>
                    Terms & Conditions
                </h2>
                <p className="mt-2 text-gray-500 text-sm ml-14">
                    Please review the following terms carefully before submitting your response.
                </p>
            </div>

            {terms ? (
                <div className="prose prose-slate max-w-none text-gray-700">
                    {/* 1. Simple String Case - Document view */}
                    {typeof terms === 'string' && (
                        <div className="pl-4 border-l-4 border-blue-100 py-2">
                            <p className="whitespace-pre-wrap leading-relaxed text-gray-600">{terms}</p>
                        </div>
                    )}

                    {/* 2. Structured Sections Case - Contract view */}
                    {typeof terms === 'object' && terms.sections && Array.isArray(terms.sections) && (
                        <div className="space-y-12">
                            {terms.sections.map((section: any, idx: number) => (
                                <div key={idx} className="group">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3 group-hover:text-blue-700 transition-colors">
                                        <span className="text-gray-300 font-mono text-sm font-normal">{(idx + 1).toString().padStart(2, '0')}</span>
                                        {section.title}
                                    </h3>
                                    <div className="text-gray-600 leading-7 whitespace-pre-wrap pl-8 border-l border-gray-100 group-hover:border-blue-100 transition-colors">
                                        {section.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 3. Generic Object Fallback - Smart List view (NO JSON) */}
                    {typeof terms === 'object' && !terms.sections && (
                        <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Terms Details</h3>
                            <RecursiveRenderer data={terms} />
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                        <FaFileContract className="text-gray-300 text-3xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No Terms Included</h3>
                    <p className="text-gray-500 max-w-sm">There are no specific terms and conditions attached to this request for proposal.</p>
                </div>
            )}
        </div>
    );
}
