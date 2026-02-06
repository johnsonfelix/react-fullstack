
"use client";

import { FaBox, FaDollarSign, FaTruck } from "react-icons/fa";

interface SupplierTabItemsProps {
    items: any[];
    responses: Record<string, any>; // Keyed by itemId
    onResponseChange: (itemId: string, field: string, value: any) => void;
    readOnly?: boolean;
}

export default function SupplierTabItems({ items, responses, onResponseChange, readOnly = false }: SupplierTabItemsProps) {
    if (!items || items.length === 0) {
        return <div className="p-8 text-center text-gray-500">No items in this request.</div>;
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-5 w-1/4">Item Description</th>
                        <th className="px-4 py-5 w-24 text-center">Req Qty</th>
                        <th className="px-4 py-5 w-32">Your Qty</th>
                        <th className="px-4 py-5 w-40">Unit Price</th>
                        <th className="px-4 py-5 w-36">Lead Time</th>
                        <th className="px-4 py-5 w-40">Part No.</th>
                        <th className="px-6 py-5 text-right w-32">Line Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {items.map((item) => {
                        const response = responses[item.id] || {};
                        const lineTotal = ((parseFloat(response.unitPrice) || 0) * (parseInt(response.qty) || 0));

                        return (
                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-5 align-top">
                                    <div className="font-bold text-gray-900 mb-1 text-base">{item.title}</div>
                                    <div className="text-xs text-gray-500 flex flex-col gap-1">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded w-fit text-gray-600 font-medium">MPN: {item.manufacturerPartNo || "-"}</span>
                                        {item.uom && <span className="text-gray-400">Unit: {item.uom}</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-5 text-center align-top pt-8">
                                    <span className="font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded text-xs">{item.quantity}</span>
                                </td>
                                <td className="px-4 py-5 align-top">
                                    <div className="relative">
                                        <FaBox className="absolute left-3 top-3 text-gray-300" size={12} />
                                        <input
                                            type="number"
                                            value={response.qty || ""}
                                            onChange={(e) => onResponseChange(item.id, 'qty', e.target.value)}
                                            disabled={readOnly}
                                            className="w-full border border-gray-200 rounded-lg py-2.5 pl-8 pr-2 text-center focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white hover:bg-white hover:border-gray-300"
                                            placeholder={String(item.quantity) || "0"}
                                        />
                                    </div>
                                </td>
                                <td className="px-4 py-5 align-top">
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-400 font-serif active:text-blue-500">$</span>
                                        <input
                                            type="number"
                                            value={response.unitPrice || ""}
                                            onChange={(e) => onResponseChange(item.id, 'unitPrice', e.target.value)}
                                            disabled={readOnly}
                                            className="w-full border border-gray-200 rounded-lg py-2.5 pl-7 pr-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white hover:bg-white hover:border-gray-300"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </td>
                                <td className="px-4 py-5 align-top">
                                    <div className="relative">
                                        <FaTruck className="absolute left-3 top-3 text-gray-300" size={12} />
                                        <input
                                            type="text"
                                            value={response.deliveryDays || ""}
                                            onChange={(e) => onResponseChange(item.id, 'deliveryDays', e.target.value)}
                                            disabled={readOnly}
                                            className="w-full border border-gray-200 rounded-lg py-2.5 pl-8 pr-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 bg-gray-50 focus:bg-white hover:bg-white hover:border-gray-300"
                                            placeholder="e.g. 14 Days"
                                        />
                                    </div>
                                </td>
                                <td className="px-4 py-5 align-top">
                                    <input
                                        type="text"
                                        value={response.supplierPartNo || ""}
                                        onChange={(e) => onResponseChange(item.id, 'supplierPartNo', e.target.value)}
                                        disabled={readOnly}
                                        className="w-full border border-gray-200 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 bg-gray-50 focus:bg-white hover:bg-white hover:border-gray-300"
                                        placeholder="Optional"
                                    />
                                </td>
                                <td className="px-6 py-5 text-right font-bold text-gray-900 align-top pt-8 font-mono">
                                    {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
