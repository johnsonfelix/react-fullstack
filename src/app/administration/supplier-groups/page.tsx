"use client";

import { useEffect, useState } from "react";

type Subcategory = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  subcategories?: Subcategory[];
};

type Supplier = {
  id: string;
  name: string;
  city: string;
  state: string;
  zipcode: string;
};

export default function SupplierGroupsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data: Category[] = await res.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSuppliersByCategory = async (categoryId: string) => {
    try {
      setSelectedCategory(categoryId);
      const res = await fetch(`/api/categories/${categoryId}/suppliers`);
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      const data: Supplier[] = await res.json();
      setSuppliers(data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left - Categories and Subcategories */}
      <div className="w-1/3 border-r p-4 bg-gray-50 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Categories</h2>
        <ul>
          {categories.map((cat) => (
            <li key={cat.id} className="mb-2">
              <div
                onClick={() => fetchSuppliersByCategory(cat.id)}
                className={`cursor-pointer p-2 rounded hover:bg-blue-100 ${
                  selectedCategory === cat.id ? "bg-blue-200 font-semibold" : ""
                }`}
              >
                {cat.name}
              </div>

              {/* Subcategories */}
              {cat.subcategories && cat.subcategories.length > 0 && (
                <ul className="ml-6 mt-1">
                  {cat.subcategories.map((subcat) => (
                    <li key={subcat.id}>
                      <div
                        onClick={() => fetchSuppliersByCategory(subcat.id)}
                        className={`cursor-pointer p-1 rounded hover:bg-blue-100 text-sm ${
                          selectedCategory === subcat.id
                            ? "bg-blue-200 font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        {subcat.name}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Right - Suppliers */}
      <div className="w-2/3 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Suppliers</h2>
        {suppliers.length === 0 ? (
          <p className="text-gray-500">
            {selectedCategory
              ? "No suppliers found for this category."
              : "Select a category to view suppliers."}
          </p>
        ) : (
          <ul className="space-y-3">
            {suppliers.map((supplier) => (
              <li
                key={supplier.id}
                className="p-4 border rounded shadow-sm bg-white"
              >
                <p className="font-semibold">{supplier.name}</p>
                <p className="text-sm text-gray-600">
                  {supplier.city}, {supplier.state} - {supplier.zipcode}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
