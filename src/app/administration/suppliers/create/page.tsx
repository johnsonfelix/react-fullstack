"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateSupplier() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    state: "",
    city: "",
    zipcode: "",
    status: "ACTIVE",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      router.push("/administration/suppliers");
      router.refresh();
    } else {
      const errorData = await res.json();
      alert(errorData.message || "Failed to create supplier.");
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Supplier</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium mb-1">Supplier Name</label>
          <input
            name="name"
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            value={formData.name}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            name="username"
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            value={formData.username}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            name="password"
            type="password"
            required
            className="w-full border rounded px-3 py-2"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            name="email"
            type="email"
            className="w-full border rounded px-3 py-2"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input
              name="state"
              type="text"
              className="w-full border rounded px-3 py-2"
              value={formData.state}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input
              name="city"
              type="text"
              className="w-full border rounded px-3 py-2"
              value={formData.city}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Zip Code</label>
            <input
              name="zipcode"
              type="text"
              className="w-full border rounded px-3 py-2"
              value={formData.zipcode}
              onChange={handleChange}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            name="status"
            className="w-full border rounded px-3 py-2"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Save Supplier
          </button>
        </div>
      </form>
    </div>
  );
}
