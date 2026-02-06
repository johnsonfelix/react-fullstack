"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaPlus, FaTrash, FaMapMarkerAlt, FaSearch, FaBuilding, FaGlobe, FaCity } from "react-icons/fa";

export default function AddressList() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const res = await fetch("/api/address", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch (error) {
      console.error("Failed to fetch addresses", error);
    } finally {
      setIsLoading(false);
    }
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

  const filteredAddresses = addresses.filter(addr =>
    addr.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    addr.line1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    addr.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Address Management</h1>
            <p className="text-gray-500 mt-1">Manage your organization's business units and locations.</p>
          </div>
          <Link
            href="/administration/address/create"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-medium"
          >
            <FaPlus size={14} /> Create New Address
          </Link>
        </div>

        {/* Stats / Info Cards (Optional Polish) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <FaBuilding size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Locations</p>
              <p className="text-2xl font-bold text-gray-900">{addresses.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <FaGlobe size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Countries</p>
              <p className="text-2xl font-bold text-gray-900">{new Set(addresses.map(a => a.country)).size}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <FaCity size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Major Cities</p>
              <p className="text-2xl font-bold text-gray-900">{new Set(addresses.map(a => a.city)).size}</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search addresses by city, street, or country..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading addresses...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200">
                    <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Street Address</th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">City & State</th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Country</th>
                    <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="py-4 px-6 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAddresses.length > 0 ? (
                    filteredAddresses.map((address) => (
                      <tr key={address.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 text-gray-500 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                              <FaMapMarkerAlt />
                            </div>
                            <span className="font-medium text-gray-900">{address.type || "Office"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600 font-medium">
                          {address.line1}
                          {address.line2 && <span className="text-gray-400 text-sm ml-1">({address.line2})</span>}
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {address.city}, <span className="text-gray-400">{address.state}</span>
                          <div className="text-xs text-gray-400 mt-0.5">{address.postalCode}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {address.country}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-500">
                          {new Date(address.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleDelete(address.id)}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                            title="Delete Address"
                          >
                            <FaTrash size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <FaBuilding size={48} className="text-gray-200 mb-4" />
                          <p className="text-lg font-medium text-gray-500">No addresses found</p>
                          <p className="text-sm">Get started by creating a new address.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
