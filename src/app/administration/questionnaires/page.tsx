"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  questions: any[];
  categoryId?: string;
  // sometimes backend nests category as `category: { id: string }`
  category?: { id?: string } | null;
}

export default function QuestionnairesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryOrder, setNewCategoryOrder] = useState<number | "">("");
  const [deleteModalTemplate, setDeleteModalTemplate] = useState<string | null>(null);
  const [deleteModalCategory, setDeleteModalCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchTemplatesForCategory(selectedCategory.id);
    } else {
      setTemplates([]);
    }
  }, [selectedCategory]);

  // fetch all categories
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch("/api/administration/questionnaire-categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data || []);
      // auto-select first category (optional)
      if (data && data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // fetch templates for a category (server-side filter preferred; client-side fallback)
  const fetchTemplatesForCategory = async (categoryId?: string) => {
    setLoadingTemplates(true);
    try {
      let url = "/api/administration/questionnaire-templates";
      if (categoryId) url += `?categoryId=${encodeURIComponent(categoryId)}`;

      console.log("Fetching templates from:", url, "for categoryId:", categoryId);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch templates");
      let data = await res.json();

      // Fallback: if the backend returns all templates (no filter), filter client-side
      if (categoryId && Array.isArray(data)) {
        data = data.filter((t: any) => {
          // support both direct categoryId field and nested category object
          return (
            t.categoryId === categoryId ||
            (t.category && (t.category.id === categoryId || t.categoryId === categoryId))
          );
        });
      }

      setTemplates(data || []);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // create a new category
  const createCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const payload = {
        name: newCategoryName.trim(),
        order: newCategoryOrder === "" ? 0 : Number(newCategoryOrder),
      };
      const res = await fetch("/api/administration/questionnaire-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create category");
      const created = await res.json();
      setCategories((prev) => [created, ...prev]);
      setNewCategoryName("");
      setNewCategoryOrder("");
      // auto-select the newly created category
      setSelectedCategory(created);
    } catch (err) {
      console.error(err);
      alert("Could not create category. See console for details.");
    }
  };

  // delete template
  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/administration/questionnaire-templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete template");
      setTemplates((t) => t.filter((x) => x.id !== id));
      setDeleteModalTemplate(null);
    } catch (err) {
      console.error(err);
      alert("Could not delete template.");
    }
  };

  // delete category
  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/administration/questionnaire-categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete category");
      setCategories((c) => c.filter((x) => x.id !== id));
      setDeleteModalCategory(null);
      if (selectedCategory?.id === id) setSelectedCategory(null);
    } catch (err) {
      console.error(err);
      alert("Could not delete category.");
    }
  };

  const toggleTemplateActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/administration/questionnaire-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error("Failed to update template");
      // refresh templates list for the selected category
      if (selectedCategory) await fetchTemplatesForCategory(selectedCategory.id);
    } catch (err) {
      console.error(err);
      alert("Could not update template.");
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Questionnaire Management</h1>
        <div className="flex gap-3 items-center">
          <Link
            href={
              selectedCategory
                ? `/administration/questionnaires/new?categoryId=${selectedCategory.id}`
                : `/administration/questionnaires/new`
            }
          >
            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition">
              <span>+</span> Create New Questionnaire
            </button>
          </Link>
        </div>
      </div>

      {/* Create Category */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mb-8">
        <h2 className="text-xl font-semibold mb-4">Create Question Category</h2>
        <form onSubmit={createCategory} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="col-span-1 md:col-span-2 p-3 border rounded-lg"
            placeholder="Category name (e.g., Documents Required)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <input
            className="p-3 border rounded-lg"
            placeholder="Order (optional)"
            type="number"
            value={newCategoryOrder === "" ? "" : String(newCategoryOrder)}
            onChange={(e) =>
              setNewCategoryOrder(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition"
            >
              Create Category
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              onClick={() => {
                setNewCategoryName("");
                setNewCategoryOrder("");
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Categories + Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Column */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Categories</h3>
              <button
                className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                onClick={() => {
                  // reload categories
                  fetchCategories();
                }}
              >
                Refresh
              </button>
            </div>

            {loadingCategories ? (
              <div className="text-center py-6">Loading categories...</div>
            ) : categories.length ? (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                      selectedCategory?.id === cat.id
                        ? "bg-teal-50 dark:bg-teal-900/20 border border-teal-200"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <div>
                      <div className="font-medium">{cat.name}</div>
                      <div className="text-xs text-gray-500">{formatDate(cat.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModalCategory(cat.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-sm text-gray-500">No categories yet.</div>
              </div>
            )}
          </div>
        </div>

        {/* Templates Column */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 border rounded-xl p-6 shadow-sm min-h-[220px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold">
                  {selectedCategory ? selectedCategory.name : "Select a category"}
                </h3>
                <div className="text-sm text-gray-500">
                  {selectedCategory ? `${templates.length} template(s)` : "Choose a category to view templates"}
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href={
                    selectedCategory
                      ? `/administration/questionnaires/new?categoryId=${selectedCategory.id}`
                      : `/administration/questionnaires/new`
                  }
                >
                  <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition">
                    New Template
                  </button>
                </Link>
                <button
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  onClick={() => {
                    if (selectedCategory) fetchTemplatesForCategory(selectedCategory.id);
                    else setTemplates([]);
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>

            {loadingTemplates ? (
              <div className="text-center py-10">Loading templates...</div>
            ) : !selectedCategory ? (
              <div className="text-center py-10">
                <div className="text-gray-500">Please select a category to view or create templates.</div>
              </div>
            ) : templates.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white/0 dark:bg-transparent border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm"
                  >
                    <div className="mb-4 flex justify-between items-start">
                      <div>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            template.isActive
                              ? "bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300"
                              : "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="text-sm text-gray-500">{formatDate(template.createdAt)}</div>
                    </div>

                    <h4 className="text-lg font-semibold mb-2">{template.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {template.description || "No description"}
                    </p>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => toggleTemplateActive(template.id, template.isActive)}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition"
                      >
                        {template.isActive ? "Deactivate" : "Activate"}
                      </button>

                      <Link href={`/administration/questionnaires/${template.id}/edit`}>
                        <button className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition">
                          Edit
                        </button>
                      </Link>

                      <Link href={`/administration/questionnaires/${template.id}`}>
                        <button className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition">
                          View
                        </button>
                      </Link>

                      <button
                        onClick={() => setDeleteModalTemplate(template.id)}
                        className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="text-gray-500 mb-4">No templates in this category yet.</div>
                <Link href={`/administration/questionnaires/new?categoryId=${selectedCategory.id}`}>
                  <button className="px-5 py-2.5 bg-teal-500 text-white rounded-lg">Create Template</button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Template Modal */}
      {deleteModalTemplate && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setDeleteModalTemplate(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">Delete Template</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this questionnaire template? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModalTemplate(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTemplate(deleteModalTemplate)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {deleteModalCategory && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setDeleteModalCategory(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">Delete Category</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Deleting a category may also delete or orphan templates under it (depending on backend rules). Are you sure?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModalCategory(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCategory(deleteModalCategory)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
