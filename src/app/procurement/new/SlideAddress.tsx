"use client";

export default function SlideAddress({
  procurementDraft,
  setProcurementDraft,
  next,
  prev,
}: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">📍 Delivery Address</h2>
      <p className="text-gray-600">Where should the goods/services be delivered?</p>

      <input
        value={procurementDraft.address || ""}
        onChange={(e) =>
          setProcurementDraft({
            ...procurementDraft,
            address: e.target.value,
          })
        }
        className="w-full p-3 border border-gray-300 rounded-lg"
        placeholder="Enter full delivery address"
      />

      <div className="flex justify-between pt-4">
        <button
          onClick={prev}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ⬅ Back
        </button>
        <button
          onClick={next}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Next ➜
        </button>
      </div>
    </div>
  );
}
