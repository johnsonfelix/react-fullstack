
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";

interface CatalogFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
    categories: any[];
    uoms: any[];
    currencies: any[];
}

export default function CatalogForm({ onClose, onSuccess, initialData, categories, uoms, currencies }: CatalogFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        itemType: "",
        description: "",
        categoryId: "",
        quantity: "",
        uomId: "",
        price: "",
        currencyId: "",
        imageUrl: "",
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                itemType: initialData.itemType,
                description: initialData.description,
                categoryId: initialData.categoryId,
                quantity: initialData.quantity.toString(),
                uomId: initialData.uomId,
                price: initialData.price.toString(),
                currencyId: initialData.currencyId,
                imageUrl: initialData.imageUrl || "",
            });
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = initialData
                ? `/api/supplier/catalog/${initialData.id}`
                : "/api/supplier/catalog";

            const method = initialData ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                throw new Error("Failed to save item");
            }

            onSuccess();
            onClose();
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-semibold">
                        {initialData ? "Edit Catalog Item" : "Add New Item"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Item Type */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Item Type</label>
                            <input
                                type="text"
                                required
                                className="w-full border rounded-lg px-3 py-2"
                                value={formData.itemType}
                                onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                                placeholder="Product / Service"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <select
                                required
                                className="w-full border rounded-lg px-3 py-2"
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                            >
                                <option value="">Select Category</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                                required
                                className="w-full border rounded-lg px-3 py-2"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Quantity</label>
                            <input
                                type="number"
                                required
                                min="0"
                                className="w-full border rounded-lg px-3 py-2"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            />
                        </div>

                        {/* UOM */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Unit of Measure</label>
                            <select
                                required
                                className="w-full border rounded-lg px-3 py-2"
                                value={formData.uomId}
                                onChange={(e) => setFormData({ ...formData, uomId: e.target.value })}
                            >
                                <option value="">Select UOM</option>
                                {uoms.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Price</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                className="w-full border rounded-lg px-3 py-2"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            />
                        </div>

                        {/* Currency */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Currency</label>
                            <select
                                required
                                className="w-full border rounded-lg px-3 py-2"
                                value={formData.currencyId}
                                onChange={(e) => setFormData({ ...formData, currencyId: e.target.value })}
                            >
                                <option value="">Select Currency</option>
                                {currencies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Image Upload */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Product Image</label>
                            <ImageUpload
                                value={formData.imageUrl}
                                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                                onRemove={() => setFormData({ ...formData, imageUrl: "" })}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {initialData ? "Save Changes" : "Add Item"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
