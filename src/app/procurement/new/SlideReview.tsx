"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

export default function SlideReview({ procurementDraft, prev }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/procurement/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(procurementDraft),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create procurement.");
      }

      const created = await res.json();
      router.push(`/buyer/rfp/${created.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800">📝 Review Your Procurement Request</h2>
      <p className="text-gray-600">Please review your details before submitting.</p>

      {/* Description */}
      <div className="bg-white rounded-lg p-4 border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">📄 Description</h3>
        <p className="text-gray-700">{procurementDraft.description || "No description provided."}</p>
      </div>

      {/* Request Type & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">🗂️ Request Type</h3>
          <p className="text-gray-700">{procurementDraft.requestType || "Not specified."}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">📦 Category</h3>
          <p className="text-gray-700">{procurementDraft.category || "Not specified."}</p>
        </div>
      </div>

      {/* Goods */}
      {procurementDraft.items && procurementDraft.items.length > 0 && (
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">📦 Goods to Procure</h3>
          <ul className="divide-y">
            {procurementDraft.items.map((item: any, idx: number) => (
              <li key={idx} className="py-2">
                <span className="font-medium">{item.title}</span> — Qty: {item.quantity}, Part#: {item.manufacturerPartNumber || "N/A"}, UOM: {item.uom || "N/A"}, Price: ${item.price}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scope of Work */}
      {procurementDraft.scopeOfWork && procurementDraft.scopeOfWork.length > 0 && (
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🛠️ Scope of Work</h3>
          <ul className="space-y-2">
            {procurementDraft.scopeOfWork.map((sow: any, idx: number) => (
              <li key={idx} className="bg-gray-50 rounded p-3">
                <p className="font-medium">{sow.title}</p>
                <p className="text-gray-700">{sow.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Questions */}
      {procurementDraft.aiQuestions && procurementDraft.aiQuestions.length > 0 && (
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🤖 AI Guided intake</h3>
          <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {procurementDraft.aiQuestions.map((q: any, idx: number) => (
              <li key={q.id} className="bg-gray-50 rounded p-3">
                <p className="font-medium text-gray-800">Q: {q.question}</p>
                <p className="text-gray-700">A: {q.answer || "No answer provided."}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          onClick={prev}
          disabled={loading}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          ⬅ Edit Details
        </button>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Create Procurement
            </>
          )}
        </button>
      </div>
    </div>
  );
}
