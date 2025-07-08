"use client";

import { useEffect, useState } from "react";

export default function CategorySelector({ supplierId }: { supplierId: string }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data));
  }, []);

  const handleAssign = async () => {
    if (!selected) return;

    await fetch(`/api/suppliers/${supplierId}/categories`, {
      method: "POST",
      body: JSON.stringify({ categoryId: selected }),
      headers: { "Content-Type": "application/json" },
    });

    setSelected("");
    location.reload();
  };

  return (
    <div className="mt-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="border px-2 py-1 text-xs rounded w-full"
      >
        <option value="">+ Assign Category</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
      {selected && (
        <button
          onClick={handleAssign}
          className="bg-blue-500 text-white text-xs mt-1 px-2 py-1 rounded hover:bg-blue-600"
        >
          Assign
        </button>
      )}
    </div>
  );
}
