"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaSpinner } from "react-icons/fa";

export default function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [supplierId, setSupplierId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        companyName: "",
        registrationEmail: "",
        website: "",
        country: "",
        organizationType: "",
        supplierType: "",
        tradeLicenseNumber: "",
        taxRegistrationNumber: "",
        noteToApprover: "",
    });

    useEffect(() => {
        // Unwrap params in Next.js 15+
        Promise.resolve(params).then((p) => {
            setSupplierId(p.id);
            fetchSupplier(p.id);
        });
    }, [params]);

    const fetchSupplier = async (id: string) => {
        try {
            const res = await fetch(`/api/supplier?id=${id}`);
            if (!res.ok) throw new Error("Failed to fetch supplier");
            const data = await res.json();

            setFormData({
                companyName: data.companyName || "",
                registrationEmail: data.registrationEmail || "",
                website: data.website || "",
                country: data.country || "",
                organizationType: data.organizationType || "",
                supplierType: data.supplierType || "",
                tradeLicenseNumber: data.tradeLicenseNumber || "",
                taxRegistrationNumber: data.taxRegistrationNumber || "",
                noteToApprover: data.noteToApprover || "",
            });
        } catch (error) {
            console.error(error);
            alert("Could not load supplier details.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId) return;

        setSaving(true);
        try {
            const res = await fetch("/api/supplier", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: supplierId, ...formData }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Update failed");
            }

            alert("Supplier updated successfully!");
            router.push("/administration/suppliers");
            router.refresh();
        } catch (error: any) {
            alert(error.message || "Failed to update supplier.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading supplier details...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6"
            >
                <FaArrowLeft /> Back to List
            </button>

            <h1 className="text-2xl font-bold mb-6">Edit Supplier: <span className="text-blue-600">{formData.companyName}</span></h1>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">

                <section>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Company Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                            <input
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                required
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Email</label>
                            <input
                                name="registrationEmail"
                                value={formData.registrationEmail}
                                onChange={handleChange}
                                required
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                            />
                            <p className="text-xs text-amber-600 mt-1">Changing this may affect the supplier&apos;s login.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                            <input
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                            <input
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                required
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                            />
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Classification</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type</label>
                            <select
                                name="organizationType"
                                value={formData.organizationType}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                            >
                                <option value="">Select...</option>
                                <option value="Private Limited">Private Limited</option>
                                <option value="Public Limited">Public Limited</option>
                                <option value="Partnership">Partnership</option>
                                <option value="Sole Proprietorship">Sole Proprietorship</option>
                                <option value="Government">Government</option>
                                <option value="Non-Profit">Non-Profit</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Type</label>
                            <select
                                name="supplierType"
                                value={formData.supplierType}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                            >
                                <option value="">Select...</option>
                                <option value="Manufacturer">Manufacturer</option>
                                <option value="Distributor">Distributor</option>
                                <option value="Service Provider">Service Provider</option>
                                <option value="Wholesaler">Wholesaler</option>
                                <option value="Retailer">Retailer</option>
                            </select>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Tax & Legal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trade License Number</label>
                            <input
                                name="tradeLicenseNumber"
                                value={formData.tradeLicenseNumber}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Reg. Number</label>
                            <input
                                name="taxRegistrationNumber"
                                value={formData.taxRegistrationNumber}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                            />
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Internal Notes</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note to Approver / Buyers</label>
                        <textarea
                            name="noteToApprover"
                            rows={3}
                            value={formData.noteToApprover}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                    </div>
                </section>

                <div className="flex justify-end gap-4 pt-4 border-t">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition flex items-center gap-2"
                    >
                        {saving && <FaSpinner className="animate-spin" />}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>

            </form>
        </div>
    );
}
