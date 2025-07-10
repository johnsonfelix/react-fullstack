"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AddressForm = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

export default function CreateAddress() {
  const router = useRouter();

  const [form, setForm] = useState<AddressForm>({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
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
        const errorData = await res.json();
        alert("Error creating address: " + (errorData.message || res.statusText));
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Create Address</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {Object.keys(form).map((field) => (
          <input
            key={field}
            type="text"
            name={field}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={form[field as keyof AddressForm]}
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
