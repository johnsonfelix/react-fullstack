"use client";
import { useState } from "react";
export default function ConfigPage() {
  const [cfg, setCfg] = useState({ defaultLineType: 'Goods', enableAutoPublish: true, defaultSLAHours: 24 });
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Global Config</h2>
      <div className="space-y-4">
        <div className="border rounded p-3">
          <label className="block text-sm">Default Line Type</label>
          <select value={cfg.defaultLineType} onChange={(e) => setCfg(s => ({ ...s, defaultLineType: e.target.value }))} className="mt-2 border p-2 rounded">
            <option>Goods</option><option>Services</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}
