"use client";
import React, { useEffect, useState } from "react";

// Single-file: ApprovalPage + ApprovalModal
// Replace your existing page.tsx with this file. It talks to the API endpoints:
// GET  /api/admin/approval-rules
// POST /api/admin/approval-rules
// PUT  /api/admin/approval-rules/:id
// DELETE /api/admin/approval-rules/:id

export type ApprovalApprover = {
  id?: string;
  approverId?: string | null;
  role?: string | null;
  email?: string | null;
  order?: number;
  isParallel?: boolean;
};

export type ApprovalRule = {
  id?: string;
  name: string;
  description?: string | null;
  criteria?: any | null;
  slaHours?: number | null;
  escalationEmail?: string | null;
  autoPublish?: boolean;
  active?: boolean;
  approvers?: ApprovalApprover[];
  createdAt?: string;
  updatedAt?: string;
};

// -----------------------
// ApprovalModal - reusable modal for create/edit
// -----------------------
function ApprovalModal({ rule, onClose, onSave }: { rule: ApprovalRule | null; onClose: () => void; onSave: (r: ApprovalRule) => void }) {
  const [form, setForm] = useState<ApprovalRule>(() => ({
    name: "",
    description: "",
    criteria: null,
    slaHours: 24,
    escalationEmail: "",
    autoPublish: false,
    active: true,
    approvers: [],
    ...rule,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((prev) => ({ ...prev, ...rule }));
  }, [rule]);

  const updateField = (k: keyof ApprovalRule, v: any) => setForm((p) => ({ ...p, [k]: v }));

  // Approver helpers
  const addApprover = () => {
    setForm((p) => ({ ...p, approvers: [ ...(p.approvers || []), { role: "", email: "", order: (p.approvers?.length || 0) + 1 } ] }));
  };
  const updateApprover = (idx: number, key: keyof ApprovalApprover, value: any) => {
    setForm((p) => ({ ...p, approvers: (p.approvers || []).map((a, i) => i === idx ? { ...a, [key]: value } : a) }));
  };
  const removeApprover = (idx: number) => {
    setForm((p) => {
      const list = (p.approvers || []).filter((_, i) => i !== idx).map((a, i) => ({ ...a, order: i + 1 }));
      return { ...p, approvers: list };
    });
  };

  const validate = () => {
    if (!form.name || String(form.name).trim().length < 3) {
      setError("Please provide a rule name (min 3 chars)");
      return false;
    }
    // approver basic validation
    if ((form.approvers || []).length === 0) {
      setError("Add at least one approver");
      return false;
    }
    setError(null);
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        criteria: form.criteria,
        slaHours: form.slaHours,
        escalationEmail: form.escalationEmail,
        autoPublish: !!form.autoPublish,
        active: typeof form.active === 'boolean' ? form.active : true,
        approvers: (form.approvers || []).map((a, idx) => ({ approverId: a.approverId ?? null, role: a.role ?? null, email: a.email ?? null, order: a.order ?? (idx + 1), isParallel: !!a.isParallel })),
      };

      let res: Response;
      if (form.id) {
        res = await fetch(`/api/admin/approval-rules/${form.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch('/api/admin/approval-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Server error');

      onSave(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 p-6 overflow-auto max-h-[90vh]">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">{form.id ? 'Edit' : 'Add'} Approval Rule</h3>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded text-sm bg-gray-100">Close</button>
            <button onClick={submit} disabled={saving} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>

        {error && <div className="mt-3 p-2 bg-red-50 text-red-700 rounded">{error}</div>}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Rule name</label>
            <input className="mt-1 w-full rounded border p-2" value={form.name ?? ''} onChange={(e) => updateField('name', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">SLA (hours)</label>
            <input type="number" min={0} className="mt-1 w-full rounded border p-2" value={form.slaHours ?? 24} onChange={(e) => updateField('slaHours', Number(e.target.value))} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea className="mt-1 w-full rounded border p-2" rows={2} value={form.description ?? ''} onChange={(e) => updateField('description', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Escalation email</label>
            <input className="mt-1 w-full rounded border p-2" value={form.escalationEmail ?? ''} onChange={(e) => updateField('escalationEmail', e.target.value)} />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.autoPublish} onChange={(e) => updateField('autoPublish', e.target.checked)} /> <span>Auto publish</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.active} onChange={(e) => updateField('active', e.target.checked)} /> <span>Active</span></label>
          </div>
        </div>

        <hr className="my-4" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Approvers</h4>
            <button onClick={addApprover} className="px-3 py-1 bg-green-600 text-white rounded text-sm">+ Add Approver</button>
          </div>

          <div className="space-y-3">
            {(form.approvers || []).map((a, idx) => (
              <div key={idx} className="p-3 border rounded flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input placeholder="Role (e.g. Procurement Head)" className="p-2 rounded border" value={a.role ?? ''} onChange={(e) => updateApprover(idx, 'role', e.target.value)} />
                  <input placeholder="Email" className="p-2 rounded border" value={a.email ?? ''} onChange={(e) => updateApprover(idx, 'email', e.target.value)} />
                  <input placeholder="Approver user id (optional)" className="p-2 rounded border" value={a.approverId ?? ''} onChange={(e) => updateApprover(idx, 'approverId', e.target.value)} />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={!!a.isParallel} onChange={(e) => updateApprover(idx, 'isParallel', e.target.checked)} /> Parallel</label>
                    <button onClick={() => removeApprover(idx)} className="ml-auto px-2 py-1 bg-red-50 text-red-600 rounded">Remove</button>
                  </div>
                </div>
                <div className="text-xs text-gray-500">Order: {a.order ?? idx + 1}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// -----------------------
// ApprovalPage - list + open modal
// -----------------------
export default function ApprovalPage() {
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<ApprovalRule | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/approval-rules');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRules(data || []);
    } catch (err) {
      console.error(err);
      // fallback sample
      setRules(prev => prev);
    } finally { setLoading(false); }
  }

  const onSave = (r: ApprovalRule) => {
    // update local list - API already returned full record
    setRules((prev) => {
      const found = prev.find(p => p.id === r.id);
      if (found) return prev.map(p => p.id === r.id ? r : p);
      return [r, ...prev];
    });
    setShowModal(false);
    setEdit(null);
  };

  const remove = async (id?: string) => {
    if (!id) return;
    if (!confirm('Delete rule?')) return;
    // optimistic
    setRules(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/admin/approval-rules/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
      await load();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Event Approval Rules</h2>
        <div>
          <button onClick={() => { setEdit(null); setShowModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded">+ Add Rule</button>
        </div>
      </div>

      {loading ? <div>Loading...</div> : (
        <div className="space-y-3">
          {rules.map(r => (
            <div key={r.id} className="border rounded p-4 bg-gray-50 flex justify-between">
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-sm text-gray-600">SLA: {r.slaHours ?? '—'}h • Auto-publish: {r.autoPublish ? 'Yes' : 'No'}</div>
                {r.description && <div className="text-sm text-gray-700 mt-2">{r.description}</div>}
                {Array.isArray(r.approvers) && r.approvers.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">Approvers: {r.approvers.map(a => a.role || a.email || a.approverId).join(' • ')}</div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEdit(r); setShowModal(true); }} className="px-3 py-1 bg-gray-200 rounded">Edit</button>
                <button onClick={() => remove(r.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <ApprovalModal rule={edit} onClose={() => { setShowModal(false); setEdit(null); }} onSave={onSave} />}
    </div>
  );
}
