// pages/address/create.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateAddress() {
  const router = useRouter();
  const [form, setForm] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    

    const res = await fetch("/api/address", {
      method: "POST",
      body: JSON.stringify(form),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      router.push("/administration/address");
    } else {
      alert("Error creating address");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Create Address</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {["street", "city", "state", "zipCode", "country"].map((field) => (
          <input
            key={field}
            type="text"
            name={field}
            placeholder={field}
            value={(form as any)[field]}
            onChange={handleChange}
            className="block w-full p-2 border rounded"
            required
          />
        ))}

        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Create Address
        </button>
      </form>
    </div>
  );
}
