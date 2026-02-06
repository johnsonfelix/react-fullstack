"use client";

import { useState, useEffect } from "react";
import { FaPlus, FaExternalLinkAlt, FaMagic, FaChartLine, FaExclamationTriangle, FaTimes, FaSearch } from "react-icons/fa";

export default function TabSuppliers({ data, onUpdate }: { data?: any, onUpdate?: (updates: any) => void }) {
    const [availableSuppliers, setAvailableSuppliers] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [manualData, setManualData] = useState({
        companyName: "",
        email: "",
        firstName: "",
        lastName: ""
    });

    useEffect(() => {
        async function fetchSuppliers() {
            try {
                const res = await fetch("/api/options/brfq");
                if (res.ok) {
                    const opt = await res.json();
                    setAvailableSuppliers(opt.suppliers || []);
                }
            } catch (err) {
                console.error("Failed to fetch suppliers", err);
            }
        }
        fetchSuppliers();
    }, []);

    const handleAddSupplier = (supplier: any) => {
        const currentSuppliers = data?.suppliers || [];
        // Prevent duplicates
        if (currentSuppliers.some((s: any) => s.id === supplier.id)) return;

        const newSupplier = {
            ...supplier,
            status: "Pending", // Default status for new add
            match: "98%", // Calculation needed
            risk: "Unknown",
            last: "Never"
        };

        if (onUpdate) {
            onUpdate({ suppliers: [...currentSuppliers, newSupplier] });
        }
        setShowAddModal(false);
    };

    const handleAddManualSupplier = () => {
        if (!manualData.companyName || !manualData.email) return;
        const currentSuppliers = data?.suppliers || [];

        const newSupplier = {
            id: `manual-${Date.now()}`,
            companyName: manualData.companyName,
            registrationEmail: manualData.email,
            // Store contact info in a way the backend can parse or use standard fields if available
            contact: {
                firstName: manualData.firstName,
                lastName: manualData.lastName,
                email: manualData.email
            },
            status: "Manual",
            match: "98%",
            risk: "-",
            last: "-",
            isManual: true
        };

        if (onUpdate) {
            onUpdate({ suppliers: [...currentSuppliers, newSupplier] });
        }
        setManualData({ companyName: "", email: "", firstName: "", lastName: "" });
        setShowAddModal(false);
    }

    const handleRemoveSupplier = (index: number) => {
        const currentSuppliers = data?.suppliers || [];
        const newSuppliers = [...currentSuppliers];
        newSuppliers.splice(index, 1);
        if (onUpdate) {
            onUpdate({ suppliers: newSuppliers });
        }
    };

    const filteredAvailable = availableSuppliers.filter(s => {
        const matchesSearch = s.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

        // Filter by Category from Overview Tab (data.category)
        // If no category selected in overview, maybe show all or none? 
        // User request: "category should match with category in overview section"
        // Let's assume if category is selected, we filter. If not, we show all (or could show none).
        // Using strict filtering as per request.

        const selectedCategory = data?.category;
        let matchesCategory = true;

        if (selectedCategory) {
            // check if supplier has this category in their productCategories
            // typically supplier.productCategories is array of { productCategory: { name: ... } }
            matchesCategory = s.productCategories?.some((pc: any) =>
                pc.productCategory?.name === selectedCategory
            );
        }

        return matchesSearch && matchesCategory;
    });

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative">
            {/* Add Supplier Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-800">Add Supplier</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="p-6">
                            {/* Manual Add */}
                            <div className="mb-6 pb-6 border-b border-gray-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Add Manual Supplier</label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <input
                                        type="text"
                                        placeholder="Company Name *"
                                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        value={manualData.companyName}
                                        onChange={(e) => setManualData({ ...manualData, companyName: e.target.value })}
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email *"
                                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        value={manualData.email}
                                        onChange={(e) => setManualData({ ...manualData, email: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="First Name *"
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        value={manualData.firstName}
                                        onChange={(e) => setManualData({ ...manualData, firstName: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name *"
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        value={manualData.lastName}
                                        onChange={(e) => setManualData({ ...manualData, lastName: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={handleAddManualSupplier}
                                    disabled={!manualData.companyName || !manualData.email || !manualData.firstName || !manualData.lastName}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add New Supplier
                                </button>
                            </div>

                            {/* Database Search */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Search Database</label>
                                <div className="relative mb-4">
                                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search existing suppliers..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                                    {filteredAvailable.length > 0 ? (
                                        filteredAvailable.map(s => (
                                            <div
                                                key={s.id}
                                                className="px-4 py-3 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center cursor-pointer"
                                                onClick={() => handleAddSupplier(s)}
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900">{s.companyName}</div>
                                                    <div className="text-xs text-gray-500">{s.country}</div>
                                                </div>
                                                <FaPlus className="text-blue-600" />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-gray-500 text-sm">
                                            {data?.category ? `No suppliers found for category "${data.category}".` : "No suppliers found."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Column: Selected Suppliers Table */}
            <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-800">Selected Suppliers ({data?.suppliers?.length || 0})</h3>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 text-sm px-3 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-white font-medium transition"
                    >
                        <FaPlus /> Add Supplier
                    </button>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Category Match</th>
                                <th className="px-6 py-3">Risk Level</th>
                                <th className="px-6 py-3">Last Invited</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data?.suppliers?.length > 0 ? (
                                data.suppliers.map((s: any, i: number) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-gray-900">{s.companyName || s.name}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === "Active" ? "bg-green-100 text-green-700" : s.status === "Pending" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '98%' }}></div>
                                                </div>
                                                <span className="text-xs text-gray-500">98%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`flex items-center gap-1 ${s.risk === "Low" ? "text-green-600" : "text-gray-500"}`}>
                                                {s.risk === "Medium" && <FaExclamationTriangle size={12} />} {s.risk || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">{s.last || "-"}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => handleRemoveSupplier(i)}
                                                className="text-gray-400 hover:text-red-500 font-medium text-lg"
                                            >
                                                ×
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No suppliers selected. Use AI Recommendations or Add Supplier manually.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right Column: AI Recommended Suppliers - Assuming these come from an API or prop in real app, keeping placeholder structure but customizable via data if needed */}
            <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                            <FaMagic />
                        </div>
                        <div>
                            <h3 className="font-semibold text-indigo-900">Suggested Suppliers</h3>
                            <p className="text-xs text-indigo-600">Active suppliers matching "{data?.category || "current category"}"</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredAvailable.length > 0 ? (
                            filteredAvailable.map((s, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-indigo-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-medium text-gray-900">{s.companyName}</h4>
                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Match</span>
                                    </div>

                                    <div className="flex gap-2 mb-3">
                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{s.country}</span>
                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{s.supplierType}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAddSupplier(s)}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5 rounded transition"
                                        >
                                            Add
                                        </button>
                                        <button className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs py-1.5 rounded transition flex items-center justify-center gap-1">
                                            Profile <FaExternalLinkAlt size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-indigo-500 italic">No suppliers found matching current criteria.</p>
                        )}
                    </div>


                </div>
            </div>
        </div>
    );
}
