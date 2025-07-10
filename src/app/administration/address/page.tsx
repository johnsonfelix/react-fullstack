"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AddressList() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<any[]>([]);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const res = await fetch("/api/address", { cache: "no-store" }); // Adjust if needed
    const data = await res.json();
    setAddresses(data);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this address?")) {
      await fetch(`/api/address/${id}`, {
        method: "DELETE",
      });
      fetchAddresses();
      router.refresh();
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Address Management</h1>
        <Link
          href="/administration/address/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + Create New Address
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6">#</th>
              <th className="py-3 px-6">Street</th>
              <th className="py-3 px-6">City</th>
              <th className="py-3 px-6">State</th>
              <th className="py-3 px-6">Zip Code</th>
              <th className="py-3 px-6">Country</th>
              <th className="py-3 px-6">Created At</th>
              <th className="py-3 px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm">
            {addresses.length > 0 ? (
              addresses.map((address, index) => (
                <tr key={address.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-6">{index + 1}</td>
                  <td className="py-3 px-6">{address.street}</td>
                  <td className="py-3 px-6">{address.city}</td>
                  <td className="py-3 px-6">{address.state}</td>
                  <td className="py-3 px-6">{address.zipCode}</td>
                  <td className="py-3 px-6">{address.country}</td>
                  <td className="py-3 px-6">{new Date(address.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-6">
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-400">
                  No addresses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
