"use client";

import { useState } from "react";

export default function SlideGoods({
  procurementDraft,
  setProcurementDraft,
  next,
  prev,
}: any) {
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [manufacturerPartNumber, setManufacturerPartNumber] = useState("");
  const [uom, setUom] = useState("");
  const [price, setPrice] = useState(0);

  const addItem = () => {
    if (!title.trim()) return alert("Please enter item title.");
    setProcurementDraft({
      ...procurementDraft,
      items: [
        ...procurementDraft.items,
        { title, quantity, manufacturerPartNumber, uom, price },
      ],
    });
    setTitle("");
    setQuantity(1);
    setManufacturerPartNumber("");
    setUom("");
    setPrice(0);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">📦 Add Goods</h2>
      <p className="text-gray-600">Add the goods you want to procure below.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Steel Bolts"
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer Part Number</label>
          <input
            value={manufacturerPartNumber}
            onChange={(e) => setManufacturerPartNumber(e.target.value)}
            placeholder="Optional"
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="e.g., 100"
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure (UOM)</label>
            <input
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              placeholder="e.g., Kg, Pieces"
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="e.g., 250"
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={addItem}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          ➕ Add Item
        </button>
      </div>

      {procurementDraft.items.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Items Added:</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-800">
            {procurementDraft.items.map((item: any, idx: number) => (
              <li key={idx}>
                {item.title} — Qty: {item.quantity}, Part#: {item.manufacturerPartNumber || "N/A"}, UOM: {item.uom || "N/A"}, Price: ${item.price}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <button
          onClick={prev}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          ⬅ Back
        </button>
        <button
          onClick={next}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Next ➜
        </button>
      </div>
    </div>
  );
}
