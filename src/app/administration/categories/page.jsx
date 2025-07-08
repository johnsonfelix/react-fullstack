"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const res = await fetch("/api/categories", { cache: "no-store" });
    const data = await res.json();
    setCategories(data);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this category?")) {
      await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      fetchCategories();
      if (selectedMainCategory?.id === id) {
        setSelectedMainCategory(null);
      }
      router.refresh();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName) return;

    await fetch("/api/categories", {
      method: "POST",
      body: JSON.stringify({
        categoryName,
        parentCategoryId: parentCategoryId || null,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    setCategoryName("");
    setParentCategoryId("");
    fetchCategories();
    router.refresh();
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Categories Management</h1>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-center mb-8">
        <input
          type="text"
          placeholder="New Category Name"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          className="border px-4 py-2 rounded w-full sm:w-64"
        />
        <select
          value={parentCategoryId}
          onChange={(e) => setParentCategoryId(e.target.value)}
          className="border px-4 py-2 rounded w-full sm:w-64"
        >
          <option value="">None (Top-level)</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + Add Category
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Categories List */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Main Categories</h2>
          <ul className="border rounded divide-y">
            {categories.length > 0 ? (
              categories.map((category) => (
                <li
                  key={category.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100 ${
                    selectedMainCategory?.id === category.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedMainCategory(category)}
                >
                  <span>{category.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(category.id);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-4 text-gray-400">No categories found.</li>
            )}
          </ul>
        </div>

        {/* Subcategories Panel */}
        <div>
          <h2 className="text-xl font-semibold mb-2">
            {selectedMainCategory ? `Subcategories of "${selectedMainCategory.name}"` : "Subcategories"}
          </h2>
          <ul className="border rounded divide-y">
            {selectedMainCategory?.subcategories?.length > 0 ? (
              selectedMainCategory.subcategories.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-100"
                >
                  <span>{sub.name}</span>
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="bg-red-400 hover:bg-red-500 text-white text-xs px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </li>
              ))
            ) : selectedMainCategory ? (
              <li className="px-4 py-4 text-gray-400">No subcategories.</li>
            ) : (
              <li className="px-4 py-4 text-gray-400">Select a category to view subcategories.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
