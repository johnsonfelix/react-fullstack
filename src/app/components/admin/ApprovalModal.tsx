// components/admin/ApprovalModal.tsx
"use client";
import React, { useEffect, useState } from "react";

export type Approver = {
  id?: string;
  role: string;
  email: string;
  order: number;
  isParallel: boolean;
};

export type ApprovalRule = {
  id: string;
  name: string;
  criteria: { minValue?: number; maxValue?: number; categories?: string[]; responseVisibility?: string[] };
  approvers: Approver[];
  slaHours: number;
  escalationEmail: string;
  autoPublish: boolean;
  active: boolean;
};

export default function ApprovalModal({
  rule,
  onClose,
  onSave,
}: {
  rule?: ApprovalRule | null;
  onClose: () => void;
  onSave: (r: ApprovalRule) => void;
}) {
  const emptyNew = (): ApprovalRule => ({
    id: "",
    name: "",
    criteria: { minValue: undefined, maxValue: undefined, categories: [], responseVisibility: [] },
    approvers: [{ id: Date.now().toString(), role: "", email: "", order: 1, isParallel: false }],
    slaHours: 24,
    escalationEmail: "",
    autoPublish: true,
    active: true,
  });

  const [local, setLocal] = useState<ApprovalRule>(rule ? JSON.parse(JSON.stringify(rule)) : emptyNew());

  useEffect(() => setLocal(rule ? JSON.parse(JSON.stringify(rule)) : emptyNew()), [rule]);

  const addApprover = () => {
    const nextOrder = (local.approvers.length ? Math.max(...local.approvers.map(a => a.order)) : 0) + 1;
    setLocal(s => ({ ...s, approvers: [...s.approvers, { id: Date.now().toString(), role: "", email: "", order: nextOrder, isParallel: false }] }));
  };

  const updateApprover = (id: string | undefined, patch: Partial<Approver>) => {
    setLocal(s => ({ ...s, approvers: s.approvers.map(a => (a.id === id ? { ...a, ...patch } : a)) }));
  };

  const removeApprover = (id?: string) => {
    setLocal(s => ({ ...s, approvers: s.approvers.filter(a => a.id !== id) }));
  };

  const submit = () => {
    if (!local.name.trim()) return alert("Name required");
    if (local.approvers.length === 0) return alert("At least one approver required");
    if (!local.id) local.id = Date.now().toString();
    onSave(local);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded shadow max-w-3xl w-full p-6 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{local.id ? "Edit Rule" : "New Rule"}</h3>
          <button onClick={onClose} className="text-sm text-gray-600">Close</button>
        </div>

        <div className="space-y-3">
          <input className="w-full border p-2 rounded" placeholder="Rule name" value={local.name} onChange={(e) => setLocal(s => ({ ...s, name: e.target.value }))} />

          <div>
            <label className="block text-sm font-medium">Criteria (optional)</label>
            <div className="flex gap-2 mt-2">
              <input type="number" className="border p-2 rounded w-1/3" placeholder="Min value" value={local.criteria.minValue ?? ""} onChange={(e) => setLocal(s => ({ ...s, criteria: { ...s.criteria, minValue: e.target.value ? Number(e.target.value) : undefined } }))} />
              <input type="number" className="border p-2 rounded w-1/3" placeholder="Max value" value={local.criteria.maxValue ?? ""} onChange={(e) => setLocal(s => ({ ...s, criteria: { ...s.criteria, maxValue: e.target.value ? Number(e.target.value) : undefined } }))} />
              <input type="text" className="border p-2 rounded w-1/3" placeholder="Categories (comma)" value={(local.criteria.categories || []).join(", ")} onChange={(e) => setLocal(s => ({ ...s, criteria: { ...s.criteria, categories: e.target.value ? e.target.value.split(",").map(t => t.trim()) : [] } }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Approvers</label>
            <div className="space-y-2 mt-2">
              {local.approvers.map((ap) => (
                <div key={ap.id} className="flex items-center gap-2 border rounded p-2">
                  <input className="border p-1 rounded w-36" placeholder="role" value={ap.role} onChange={(e) => updateApprover(ap.id, { role: e.target.value })} />
                  <input className="border p-1 rounded flex-1" placeholder="email" value={ap.email} onChange={(e) => updateApprover(ap.id, { email: e.target.value })} />
                  <label className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={ap.isParallel} onChange={(e) => updateApprover(ap.id, { isParallel: e.target.checked })} /> parallel
                  </label>
                  <button onClick={() => removeApprover(ap.id)} className="text-red-600 px-2">Remove</button>
                </div>
              ))}
              <button onClick={addApprover} className="px-3 py-1 bg-blue-600 text-white rounded">+ Add Approver</button>
            </div>
          </div>

          <div className="flex gap-3">
            <input type="number" className="border p-2 rounded w-1/3" placeholder="SLA hours" value={local.slaHours} onChange={(e) => setLocal(s => ({ ...s, slaHours: Number(e.target.value) }))} />
            <input className="border p-2 rounded flex-1" placeholder="Escalation email" value={local.escalationEmail} onChange={(e) => setLocal(s => ({ ...s, escalationEmail: e.target.value }))} />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={local.autoPublish} onChange={(e) => setLocal(s => ({ ...s, autoPublish: e.target.checked }))} /> Auto Publish</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={local.active} onChange={(e) => setLocal(s => ({ ...s, active: e.target.checked }))} /> Active</label>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
            <button onClick={submit} className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
