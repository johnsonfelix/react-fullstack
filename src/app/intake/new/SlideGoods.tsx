"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type DraftItem = {
  lineNo: number;
  lineType: string;
  itemNumber: string;
  itemDescription: string;
  brandManufacturer: string;
  uom: string;
  _raw?: any;
};

export default function SlideGoods({
  procurementDraft,
  setProcurementDraft,
  prev,
}: any) {
  const router = useRouter();
  const TYPE_DEFAULT = "Goods";

  const normalizeDraftItems = (items: any[]): DraftItem[] => {
    if (!Array.isArray(items)) return [];

    return items.map((it: any, idx: number) => {
      if (typeof it === "string") {
        return {
          lineNo: idx + 1,
          lineType: TYPE_DEFAULT,
          itemNumber: "",
          itemDescription: it,
          brandManufacturer: "",
          uom: "",
        };
      }

      return {
        lineNo: idx + 1,
        lineType: it.lineType ?? TYPE_DEFAULT,
        itemNumber: it.itemNumber ?? "",
        itemDescription: it.itemDescription ?? it.description ?? "",
        brandManufacturer: it.brandManufacturer ?? it.brand ?? "",
        uom: it.uom ?? "",
        _raw: it,
      };
    });
  };

  const [rows, setRows] = useState<DraftItem[]>(() =>
    normalizeDraftItems(procurementDraft.items || [])
  );

  const renumber = (list: DraftItem[]) =>
    list.map((r, i) => ({ ...r, lineNo: i + 1 }));

  const addRow = () => {
    setRows((prev) =>
      renumber([
        ...prev,
        {
          lineNo: prev.length + 1,
          lineType: TYPE_DEFAULT,
          itemNumber: "",
          itemDescription: "",
          brandManufacturer: "",
          uom: "",
        },
      ])
    );
  };

  const updateRow = (index: number, patch: Partial<DraftItem>) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const deleteRow = (index: number) => {
    setRows((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return renumber(copy);
    });
  };

  const handleFinish = () => {
    const finalItems = rows.map((r) => ({
      lineNo: r.lineNo,
      lineType: r.lineType,
      itemNumber: r.itemNumber,
      itemDescription: r.itemDescription,
      brandManufacturer: r.brandManufacturer,
      uom: r.uom,
      _raw: r._raw ?? null,
    }));

    const finalDraft = { ...procurementDraft, items: finalItems };

    sessionStorage.setItem("procurementDraft", JSON.stringify(finalDraft));

    if (typeof setProcurementDraft === "function")
      setProcurementDraft(finalDraft);

    router.push("/buyer/events/create");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">📦 Goods / Items Details</h2>
      <p className="text-sm text-gray-600">
        Add the items you want to procure. You can edit them later in the event
        creation page.
      </p>

      <div className="bg-white border p-4 rounded-lg space-y-3">
        {/* Header */}
        <div className="grid grid-cols-7 gap-3 font-semibold text-sm text-gray-600 border-b pb-2">
          <div>Line No</div>
          <div>Type</div>
          <div>Item #</div>
          <div className="col-span-2">Description</div>
          <div>Brand</div>
          <div>UOM</div>
        </div>

        {/* Rows */}
        {rows.map((row, index) => (
          <div
            key={row.lineNo}
            className="grid grid-cols-7 gap-3 items-center py-2 border-b"
          >
            <input
              readOnly
              value={row.lineNo}
              className="px-2 py-1 border rounded bg-gray-100 text-sm"
            />

            <select
              value={row.lineType}
              onChange={(e) => updateRow(index, { lineType: e.target.value })}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="Goods">Goods</option>
              <option value="Services">Services</option>
            </select>

            <input
              value={row.itemNumber}
              onChange={(e) => updateRow(index, { itemNumber: e.target.value })}
              placeholder="Item #"
              className="px-2 py-1 border rounded text-sm"
            />

            <input
              value={row.itemDescription}
              onChange={(e) =>
                updateRow(index, { itemDescription: e.target.value })
              }
              placeholder="Description"
              className="px-2 py-1 border rounded text-sm col-span-2"
            />

            <input
              value={row.brandManufacturer}
              onChange={(e) =>
                updateRow(index, { brandManufacturer: e.target.value })
              }
              placeholder="Brand"
              className="px-2 py-1 border rounded text-sm"
            />

            <input
              value={row.uom}
              onChange={(e) => updateRow(index, { uom: e.target.value })}
              placeholder="UOM"
              className="px-2 py-1 border rounded text-sm"
            />

            <button
              onClick={() => deleteRow(index)}
              className="text-red-600 text-xs underline ml-2 col-span-7 text-right"
            >
              Remove
            </button>
          </div>
        ))}

        {/* Add Item Button */}
        <button
          onClick={addRow}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
        >
          + Add Item
        </button>
      </div>

      <div className="flex justify-between">
        <button onClick={prev} className="py-2 px-4 border rounded">
          Back
        </button>

        <button
          onClick={handleFinish}
          className="py-2 px-6 bg-green-600 text-white rounded"
        >
          Create procurement event
        </button>
      </div>
    </div>
  );
}
