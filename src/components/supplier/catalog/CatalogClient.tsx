
"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, FileCode } from "lucide-react";
import CatalogForm from "./CatalogForm";
import CxmlUpload from "./CxmlUpload";
import { useRouter } from "next/navigation";

interface CatalogClientProps {
    items: any[];
    categories: any[];
    uoms: any[];
    currencies: any[];
}

export default function CatalogClient({ items, categories, uoms, currencies }: CatalogClientProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredItems = items.filter((item) =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            const res = await fetch(`/api/supplier/catalog/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");

            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to delete item");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search items..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <CxmlUpload />
                    <a
                        href="/api/supplier/catalog/cxml/template"
                        download
                        className="flex items-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                    >
                        <FileCode className="w-4 h-4 mr-2" />
                        Download Template
                    </a>
                    <button
                        onClick={handleAdd}
                        className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                    </button>
                </div>
            </div>

            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Image</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Qty</th>
                                <th className="px-6 py-3">UOM</th>
                                <th className="px-6 py-3">Price</th>
                                <th className="px-6 py-3">Currency</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                                        No items found. Add some items to your catalog.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            {item.imageUrl ? (
                                                <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-100 border">
                                                    <img
                                                        src={item.imageUrl}
                                                        alt={item.description}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                                    No Img
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{item.itemType}</td>
                                        <td className="px-6 py-4 max-w-xs truncate" title={item.description}>
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-4">{item.category?.name}</td>
                                        <td className="px-6 py-4">{item.quantity}</td>
                                        <td className="px-6 py-4">{item.uom?.name}</td>
                                        <td className="px-6 py-4">{item.price.toFixed(2)}</td>
                                        <td className="px-6 py-4">{item.currency?.name}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <CatalogForm
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        // Success handling if needed, router.refresh handles data update
                    }}
                    initialData={editingItem}
                    categories={categories}
                    uoms={uoms}
                    currencies={currencies}
                />
            )}
        </div>
    );
}
