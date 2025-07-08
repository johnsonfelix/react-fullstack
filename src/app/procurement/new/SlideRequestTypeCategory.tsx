"use client";

export default function SlideRequestTypeCategory({
  procurementDraft,
  setProcurementDraft,
  next,
  prev,
}: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">🔍 Confirm Request Type & Category</h2>
      <p className="text-gray-600">Check and adjust if needed.</p>

      <div>
        <label className="block mb-1 text-sm font-medium">Request Type</label>
        <input
          value={procurementDraft.requestType || ""}
          onChange={(e) =>
            setProcurementDraft({
              ...procurementDraft,
              requestType: e.target.value,
            })
          }
          className="w-full p-3 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block mb-1 text-sm font-medium">Category</label>
        <input
          value={procurementDraft.category || ""}
          onChange={(e) =>
            setProcurementDraft({
              ...procurementDraft,
              category: e.target.value,
            })
          }
          className="w-full p-3 border border-gray-300 rounded-lg"
        />
      </div>

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
