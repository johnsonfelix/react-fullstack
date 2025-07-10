'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SupplierList() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
    fetchCategories();
  }, []);

  const fetchSuppliers = async () => {
    const res = await fetch("/api/suppliers", { cache: "no-store" });
    const data = await res.json();
    setSuppliers(data);
  };

  const fetchCategories = async () => {
    const res = await fetch("/api/categories", { cache: "no-store" });
    const data = await res.json();
    setCategories(data);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      fetchSuppliers();
      router.refresh();
    }
  };

  const handleAssign = async () => {
    if (!selectedCategory) return;

    await fetch(`/api/suppliers/${currentSupplier}/categories`, {
      method: "POST",
      body: JSON.stringify({
        categoryId: selectedCategory,
        subcategoryIds: selectedSubcategories, // can be empty
      }),
      headers: { "Content-Type": "application/json" },
    });

    setOpenModal(false);
    setSelectedCategory(null);
    setSelectedSubcategories([]);
    fetchSuppliers();
  };

  const handleRemoveCategory = async (supplierId: string, categoryId: string) => {
    await fetch(`/api/suppliers/${supplierId}/categories/${categoryId}`, {
      method: "DELETE",
    });
    fetchSuppliers();
    router.refresh();
  };

  const openCategoryModal = (supplierId: string) => {
    setCurrentSupplier(supplierId);
    setOpenModal(true);
    setSelectedCategory(null);
    setSelectedSubcategories([]);
  };

  const selectedCatObj = categories.find((cat) => cat.id === selectedCategory);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Supplier Management</h1>
        <Link
          href="/administration/suppliers/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + Create New Supplier
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6">#</th>
              <th className="py-3 px-6">Supplier Name</th>
              <th className="py-3 px-6">Username</th>
              <th className="py-3 px-6">Email</th>
              <th className="py-3 px-6">State</th>
              <th className="py-3 px-6">City</th>
              <th className="py-3 px-6">Zip Code</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6">Created At</th>
              <th className="py-3 px-6">Categories</th>
              <th className="py-3 px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm">
            {suppliers.length > 0 ? (
              suppliers.map((supplier, index) => (
                <tr key={supplier.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-6">{index + 1}</td>
                  <td className="py-3 px-6">{supplier.name}</td>
                  <td className="py-3 px-6">{supplier.user?.username || "-"}</td>
                  <td className="py-3 px-6">{supplier.user?.email || "-"}</td>
                  <td className="py-3 px-6">{supplier.state}</td>
                  <td className="py-3 px-6">{supplier.city}</td>
                  <td className="py-3 px-6">{supplier.zipcode}</td>
                  <td className="py-3 px-6">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        supplier.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {supplier.status}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    {new Date(supplier.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex flex-col gap-y-2">
                      {supplier.group?.length > 0 ? (
                        supplier.group.map((cat: any) => {
                          // Find full category with all subcategories
                          const fullCategory = categories.find(c => c.id === cat.id);

                          // Filter only assigned subcategories by their IDs
                          // Assumes cat.assignedSubcategoryIds is an array of subcategory IDs assigned to this supplier for this category
                          const assignedSubs = fullCategory?.subcategories.filter((sub: any) =>
                            cat.assignedSubcategoryIds?.includes(sub.id)
                          ) || [];

                          return (
                            <div key={cat.id} className="bg-gray-100 rounded px-3 py-2 text-xs">
                              <div className="flex items-center justify-between font-semibold text-gray-700">
                                <span>{cat.name}</span>
                                <button
                                  onClick={() => handleRemoveCategory(supplier.id, cat.id)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  ✖
                                </button>
                              </div>
                              {assignedSubs.length > 0 && (
                                <ul className="list-disc list-inside text-gray-600 mt-1 pl-2">
                                  {assignedSubs.map((sub: any) => (
                                    <li key={sub.id}>{sub.name}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-gray-400 italic text-xs">No categories</span>
                      )}
                      <button
                        onClick={() => openCategoryModal(supplier.id)}
                        className="text-blue-600 hover:underline text-xs mt-1"
                      >
                        + Add Category
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="text-center py-6 text-gray-400">
                  No suppliers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Select Category and Subcategories</h2>
            <div className="flex gap-4">
              <div className="w-1/2 border-r pr-4">
                <ul>
                  {categories.map((cat) => (
                    <li
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSelectedSubcategories([]);
                      }}
                      className={`cursor-pointer px-3 py-2 rounded hover:bg-gray-100 ${
                        selectedCategory === cat.id ? "bg-blue-100 font-semibold" : ""
                      }`}
                    >
                      {cat.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="w-1/2">
                {selectedCatObj ? (
                  selectedCatObj.subcategories?.length > 0 ? (
                    selectedCatObj.subcategories.map((sub: any) => (
                      <label key={sub.id} className="block text-sm">
                        <input
                          type="checkbox"
                          value={sub.id}
                          checked={selectedSubcategories.includes(sub.id)}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSelectedSubcategories((prev) =>
                              e.target.checked
                                ? [...prev, value]
                                : prev.filter((id) => id !== value)
                            );
                          }}
                          className="mr-2"
                        />
                        {sub.name}
                      </label>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm italic">No subcategories</p>
                  )
                ) : (
                  <p className="text-gray-400 text-sm">Select a category to view subcategories.</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => {
                  setOpenModal(false);
                  setSelectedCategory(null);
                  setSelectedSubcategories([]);
                }}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedCategory}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
