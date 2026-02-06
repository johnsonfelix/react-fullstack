"use client";

import { useState } from "react";
import { FaUser, FaBox, FaQuestionCircle, FaPaperclip, FaDownload, FaEye } from "react-icons/fa";

export default function TabResponses({ data }: { data: any }) {
    const suppliers = data.suppliers || [];
    const quotes = data.quotes || [];
    const responses = data.rfpResponses || [];

    // Only show suppliers who have submitted something (quote or response)
    // Or just show all invited suppliers and indicate their status

    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(suppliers.length > 0 ? suppliers[0].id : null);

    const selectedSupplier = suppliers.find((s: any) => s.id === selectedSupplierId);

    // Get data for selected supplier
    const supplierQuote = quotes.find((q: any) => q.supplierId === selectedSupplierId);
    const supplierResponses = responses.filter((r: any) => r.supplierId === selectedSupplierId);

    // Group answers by question ID for easy lookup
    const answersMap: Record<string, any> = {};
    supplierResponses.forEach((r: any) => {
        answersMap[r.questionId] = r.answer;
    });

    if (suppliers.length === 0) {
        return <div className="p-8 text-center text-gray-500">No suppliers have been invited yet.</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
            {/* Sidebar: Supplier List */}
            <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-700">Suppliers</h3>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {suppliers.map((s: any) => {
                        const hasQuote = quotes.some((q: any) => q.supplierId === s.id);
                        return (
                            <button
                                key={s.id}
                                onClick={() => setSelectedSupplierId(s.id)}
                                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${selectedSupplierId === s.id
                                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                        : "hover:bg-gray-50 text-gray-700"
                                    }`}
                            >
                                <div>
                                    <div className="font-medium truncate max-w-[150px]">{s.companyName || s.name}</div>
                                    <div className="text-xs opacity-70">{s.contact?.email || s.registrationEmail}</div>
                                </div>
                                {hasQuote && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content: Response Details */}
            <div className="lg:col-span-3 space-y-6">
                {selectedSupplier ? (
                    <>
                        {/* Summary Card */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FaUser className="text-blue-500" /> {selectedSupplier.companyName || selectedSupplier.name}
                            </h2>
                            {supplierQuote ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="text-sm text-gray-500 mb-1">Quote Reference</div>
                                        <div className="font-mono font-medium text-gray-800">{supplierQuote.supplierQuoteNo}</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="text-sm text-gray-500 mb-1">Total Value</div>
                                        <div className="font-mono font-bold text-green-600">
                                            {supplierQuote.items?.reduce((acc: number, item: any) => acc + (item.qty * item.unitPrice), 0).toLocaleString()} {supplierQuote.currency}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="text-sm text-gray-500 mb-1">Validity</div>
                                        <div className="font-medium text-gray-800">{supplierQuote.validFor}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 bg-yellow-50 text-yellow-700 rounded-lg text-sm border border-yellow-100">
                                    No quote submitted yet.
                                </div>
                            )}
                        </div>

                        {/* Line Items */}
                        {supplierQuote && supplierQuote.items && supplierQuote.items.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                        <FaBox className="text-gray-400" /> Line Items
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 font-medium">Item</th>
                                                <th className="px-6 py-3 font-medium">Qty</th>
                                                <th className="px-6 py-3 font-medium">Unit Price</th>
                                                <th className="px-6 py-3 font-medium">Total</th>
                                                <th className="px-6 py-3 font-medium">Lead Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {supplierQuote.items.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-3 font-medium text-gray-900">
                                                        {data.items?.find((i: any) => i.id === item.procurementItemId)?.description || "Item"}
                                                    </td>
                                                    <td className="px-6 py-3">{item.qty}</td>
                                                    <td className="px-6 py-3">{item.unitPrice.toLocaleString()} {supplierQuote.currency}</td>
                                                    <td className="px-6 py-3 font-medium">{(item.qty * item.unitPrice).toLocaleString()} {supplierQuote.currency}</td>
                                                    <td className="px-6 py-3">{item.deliveryDays}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Attachments */}
                        {supplierQuote && supplierQuote.attachments && supplierQuote.attachments.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                        <FaPaperclip className="text-gray-400" /> Attachments
                                    </h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {supplierQuote.attachments.map((file: any, idx: number) => {
                                        // Handle backward compatibility where attachments might be list of strings or objects
                                        const url = typeof file === 'string' ? file : file.url || file.id; // Fallback
                                        const name = typeof file === 'string' ? file.split('/').pop() : file.name || "Attachment";

                                        return (
                                            <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="bg-blue-100 p-2 rounded text-blue-600">
                                                        <FaPaperclip size={14} />
                                                    </div>
                                                    <span className="truncate text-sm font-medium text-gray-700" title={name}>{name}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => window.open(url, '_blank')}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="View"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <a
                                                        href={url}
                                                        download
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                                        title="Download"
                                                    >
                                                        <FaDownload />
                                                    </a>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Questionnaire Answers (Optional - Expandable?) */}
                        {data.deliverables && data.deliverables.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                        <FaQuestionCircle className="text-gray-400" /> Questionnaire Responses
                                    </h3>
                                </div>
                                <div className="p-6 text-sm">
                                    {Object.keys(answersMap).length > 0 ? (
                                        <div className="space-y-6">
                                            {data.deliverables.map((section: any, idx: number) => (
                                                <div key={idx}>
                                                    <h4 className="font-bold text-gray-900 mb-3">{section.title}</h4>
                                                    <div className="space-y-4 pl-4 border-l-2 border-gray-100">
                                                        {section.questions && section.questions.map((q: any) => {
                                                            const answer = answersMap[q.id];
                                                            return (
                                                                <div key={q.id}>
                                                                    <p className="text-gray-600 mb-1">{q.text}</p>
                                                                    <div className="p-3 bg-gray-50 rounded-lg text-gray-800 font-medium">
                                                                        {answer ? (typeof answer.value === 'object' ? JSON.stringify(answer.value) : answer.value) : <span className="text-gray-400 italic">Not answered</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">No questionnaire answers submitted.</p>
                                    )}
                                </div>
                            </div>
                        )}

                    </>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <FaUser size={24} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Select a Supplier</h3>
                        <p className="text-gray-500">View detailed response, quote, and attachments.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
