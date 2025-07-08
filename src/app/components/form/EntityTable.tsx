// components/EntityTable.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface EntityTableProps {
  title: string;
  apiPath: string;
  createLink: string;
  displayField: string;
}

export default function EntityTable({ title, apiPath, createLink, displayField }: EntityTableProps) {
  const [items, setItems] = useState([]);

  const fetchItems = async () => {
    const res = await fetch(`/api/${apiPath}`, { cache: "no-store" });
    const data = await res.json();
    setItems(data);
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to delete this ${title.toLowerCase()}?`)) {
      await fetch(`/api/${apiPath}/${id}`, {
        method: "DELETE",
      });
      fetchItems();
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{title} Management</h1>
        <Link
          href={createLink}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + Add New {title}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6">#</th>
              <th className="py-3 px-6">{title} Name</th>
              <th className="py-3 px-6">Created At</th>
              <th className="py-3 px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm">
            {items.length > 0 ? (
              items.map((item: any, index: number) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-6">{index + 1}</td>
                  <td className="py-3 px-6">{item[displayField]}</td>
                  <td className="py-3 px-6">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-6">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-400">
                  No {title.toLowerCase()}s found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
