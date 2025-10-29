"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Cat = {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  children?: Cat[]; // optional nested shape
};

export default function CategoriesPage() {
  const router = useRouter();

  // keep both shapes explicit
  const [treeCats, setTreeCats] = useState<Cat[]>([]);
  const [flatCats, setFlatCats] = useState<Cat[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] = useState<Cat | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper: build a tree from a flat list
  const buildTreeFromFlat = (flat: Cat[]) => {
    const map = new Map<string, Cat & { children: Cat[] }>();
    flat.forEach((c) => map.set(c.id, { ...c, children: [] }));

    const roots: (Cat & { children: Cat[] })[] = [];
    for (const c of flat) {
      const node = map.get(c.id)!;
      const p = c.parentId ?? null;
      if (p && map.get(p)) {
        map.get(p)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots as Cat[];
  };

  // helper: flatten nested tree to flat array
  const flattenTree = (nodes: Cat[] = []) => {
    const out: Cat[] = [];
    const walk = (n: Cat[]) => {
      n.forEach((node) => {
        out.push(node);
        const children = node.children ?? [];
        if (children.length) walk(children);
      });
    };
    walk(nodes);
    return out;
  };

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/product-categories", { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to load categories: ${res.status} ${text}`);
      }

      const raw = await res.json().catch(() => null);
      console.log("API raw response for product-categories:", raw);

      let flat: Cat[] = [];
      let tree: Cat[] = [];

      if (Array.isArray(raw)) {
        // server returned a flat array
        flat = raw;
        tree = buildTreeFromFlat(flat);
      } else if (raw && Array.isArray(raw.flat) && Array.isArray(raw.tree)) {
        // server returned both
        flat = raw.flat;
        tree = raw.tree;
      } else if (raw && Array.isArray(raw.tree)) {
        // server returned tree only
        tree = raw.tree;
        flat = flattenTree(tree);
      } else if (raw && Array.isArray(raw.categories)) {
        flat = raw.categories;
        tree = buildTreeFromFlat(flat);
      } else if (raw && Array.isArray(raw.data)) {
        flat = raw.data;
        tree = buildTreeFromFlat(flat);
      } else {
        // last resort: try to extract any array property
        const maybe = ["tree", "flat", "categories", "data", "result", "items"].find((k) => Array.isArray(raw?.[k]));
        if (maybe) {
          flat = raw[maybe];
          tree = buildTreeFromFlat(flat);
        } else {
          flat = [];
          tree = [];
        }
      }

      // persist both
      setFlatCats(flat);
      setTreeCats(tree);

      // if currently selected category exists, re-resolve it to fresh node from flat/tree
      if (selectedMainCategory) {
        const fresh = findNodeById(selectedMainCategory.id, { flat, tree });
        setSelectedMainCategory(fresh);
      }
    } catch (err: any) {
      console.error("fetchCategories error", err);
      setError(err?.message || "Failed to load categories");
      setFlatCats([]);
      setTreeCats([]);
    } finally {
      setLoading(false);
    }
  };

  // find node by id using both shapes
  const findNodeById = (id: string, shapes?: { flat?: Cat[]; tree?: Cat[] }) => {
    const flat = shapes?.flat ?? flatCats;
    const tree = shapes?.tree ?? treeCats;

    // Prefer tree search (it may include children nested)
    const searchTree = (nodes: Cat[]): Cat | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        const childMatch = searchTree(n.children ?? []);
        if (childMatch) return childMatch;
      }
      return null;
    };
    const tmatch = searchTree(tree);
    if (tmatch) return tmatch;

    // fallback to flat search and attach computed children (derived from flat)
    const fmatch = flat.find((f) => f.id === id) ?? null;
    if (fmatch) {
      const children = flat.filter((f) => f.parentId === id);
      return { ...fmatch, children };
    }
    return null;
  };

  // top-level categories to show in left column (roots)
  const topLevelCategories = () => {
    // prefer tree roots for nicer ordering (they already group children)
    if (treeCats.length > 0) return treeCats;
    // fallback to flat roots
    return flatCats.filter((c) => !c.parentId);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`/api/product-categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Delete failed: ${res.status}`);
      }
      await fetchCategories();
      setSelectedMainCategory((s) => (s?.id === id ? null : s));
    } catch (err: any) {
      console.error("Delete error", err);
      alert(err?.message || "Failed to delete category");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setActionInProgress(true);
    try {
      const res = await fetch("/api/product-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryName: categoryName.trim(),
          description: categoryDescription.trim() || null,
          parentCategoryId: parentCategoryId || null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Create failed: ${res.status}`);
      }

      setCategoryName("");
      setCategoryDescription("");
      setParentCategoryId("");
      await fetchCategories();
      // optionally navigate
      // router.refresh(); // unnecessary if you update state
    } catch (err: any) {
      console.error("Create category error", err);
      alert(err?.message || "Failed to create category");
    } finally {
      setActionInProgress(false);
    }
  };

  // when a category is clicked, resolve canonical node + children from flat
  const onClickCategory = (category: Cat) => {
    const node = findNodeById(category.id);
    if (!node) {
      // fallback: set raw category
      setSelectedMainCategory(category);
      return;
    }
    // ensure children are available (derived from flat if needed)
    const children = (node.children && node.children.length > 0) ? node.children : flatCats.filter((c) => c.parentId === node.id);
    setSelectedMainCategory({ ...node, children });
  };

  // children to render for selectedMainCategory
  const selectedChildren = () => {
    if (!selectedMainCategory) return [];
    return (selectedMainCategory.children && selectedMainCategory.children.length > 0)
      ? selectedMainCategory.children
      : flatCats.filter((c) => c.parentId === selectedMainCategory.id);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Categories Management</h1>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-start mb-8">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            placeholder="New Category Name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            className="border px-4 py-2 rounded w-full sm:w-auto"
            disabled={actionInProgress}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={categoryDescription}
            onChange={(e) => setCategoryDescription(e.target.value)}
            className="border px-4 py-2 rounded w-full mt-2"
            disabled={actionInProgress}
          />
        </div>

        <select
          value={parentCategoryId}
          onChange={(e) => setParentCategoryId(e.target.value)}
          className="border px-4 py-2 rounded w-full sm:w-64"
          disabled={actionInProgress || loading}
        >
          <option value="">None (Top-level)</option>
          {flatCats.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition ${actionInProgress ? "opacity-60 cursor-not-allowed" : ""}`}
          disabled={actionInProgress}
        >
          + Add Category
        </button>
      </form>

      {loading ? (
        <div className="text-sm text-gray-500">Loading categories...</div>
      ) : error ? (
        <div className="text-sm text-red-600">Error: {error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Categories */}
          <div>
            <h2 className="text-xl font-semibold mb-2">Main Categories</h2>
            <ul className="border rounded divide-y">
              {topLevelCategories().length > 0 ? (
                topLevelCategories().map((category) => (
                  <li
                    key={category.id}
                    className={`flex flex-col gap-2 px-4 py-3 cursor-pointer hover:bg-gray-100 ${selectedMainCategory?.id === category.id ? "bg-blue-50" : ""}`}
                    onClick={() => onClickCategory(category)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(category.id);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                        disabled={actionInProgress}
                      >
                        Delete
                      </button>
                    </div>
                    {category.description ? <div className="text-sm text-gray-600">{category.description}</div> : null}
                  </li>
                ))
              ) : (
                <li className="px-4 py-4 text-gray-400">No categories found.</li>
              )}
            </ul>
          </div>

          {/* Subcategories */}
          <div>
            <h2 className="text-xl font-semibold mb-2">
              {selectedMainCategory ? `Subcategories of "${selectedMainCategory.name}"` : "Subcategories"}
            </h2>
            <ul className="border rounded divide-y">
              {selectedMainCategory ? (
                selectedChildren().length > 0 ? (
                  selectedChildren().map((sub) => (
                    <li key={sub.id} className="flex flex-col gap-2 px-4 py-3 hover:bg-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{sub.name}</span>
                        <div className="flex items-center gap-2">
                          {/* <button
                            onClick={() => {
                              const node = findNodeById(sub.id);
                              setSelectedMainCategory(node ?? sub);
                            }}
                            className="text-xs px-2 py-1 rounded border"
                            disabled={actionInProgress}
                          >
                            View
                          </button> */}
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="bg-red-400 hover:bg-red-500 text-white text-xs px-2 py-1 rounded"
                            disabled={actionInProgress}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {sub.description ? <div className="text-sm text-gray-600">{sub.description}</div> : null}
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-4 text-gray-400">No subcategories.</li>
                )
              ) : (
                <li className="px-4 py-4 text-gray-400">Select a category to view subcategories.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
