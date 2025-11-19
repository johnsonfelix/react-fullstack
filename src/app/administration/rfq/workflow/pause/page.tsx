"use client";

import React, { useEffect, useState } from "react";

type PauseReason = {
  id: string;
  key?: string;
  label: string;
  active: boolean;
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove invalid chars
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function PausePage() {
  const [reasons, setReasons] = useState<PauseReason[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newReasonText, setNewReasonText] = useState("");

  // For pausing/resuming an event (buyer flow)
  const [rfqIdToPause, setRfqIdToPause] = useState("");
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [pauseOpLoading, setPauseOpLoading] = useState(false);

  useEffect(() => {
    fetchReasons();
  }, []);

  async function fetchReasons() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pause-reasons");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      const data = json.data ?? json;
      setReasons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      alert("Could not load pause reasons");
    } finally {
      setLoading(false);
    }
  }

  // Create a new reason
  async function addReason() {
    const text = newReasonText.trim();
    if (!text) {
      alert("Please enter a reason");
      return;
    }
    setSaving(true);
    try {
      const payload = { key: slugify(text), label: text, active: true };
      const res = await fetch("/api/admin/pause-reasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Add failed");
      }
      const json = await res.json();
      const created = json.data ?? json;
      setReasons((p) => [created, ...p]);
      setNewReasonText("");
      alert("Pause reason added");
    } catch (err) {
      console.error(err);
      alert("Failed to add reason");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(reason: PauseReason) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pause-reasons/${encodeURIComponent(reason.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !reason.active }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Update failed");
      }
      const json = await res.json();
      const updated = json.data ?? json;
      setReasons((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      alert("Saved");
    } catch (err) {
      console.error(err);
      alert("Failed to update reason");
    } finally {
      setSaving(false);
    }
  }

  async function updateReasonText(id: string, text: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pause-reasons/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: text }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Update failed");
      }
      const json = await res.json();
      const updated = json.data ?? json;
      setReasons((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      alert("Saved");
    } catch (err) {
      console.error(err);
      alert("Failed to update reason");
    } finally {
      setSaving(false);
    }
  }

  async function deleteReason(id: string) {
    if (!confirm("Delete this pause reason?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pause-reasons/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Delete failed");
      }
      setReasons((prev) => prev.filter((r) => r.id !== id));
      alert("Deleted");
    } catch (err) {
      console.error(err);
      alert("Failed to delete reason");
    } finally {
      setSaving(false);
    }
  }

  

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pause Reasons</h2>
        <div className="text-sm text-gray-500">Manage reasons used when buyers pause events</div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="flex gap-2 mb-4">
          <input
            value={newReasonText}
            onChange={(e) => setNewReasonText(e.target.value)}
            placeholder="Add new reason (e.g. Technical Issue)"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button onClick={addReason} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Add
          </button>
        </div>

        {loading ? (
          <div className="text-center py-6">Loading...</div>
        ) : reasons.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No reasons configured</div>
        ) : (
          <div className="space-y-2">
            {reasons.map((r) => (
              <div key={r.id} className="flex items-center gap-3 justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={r.active} onChange={() => toggleActive(r)} />
                  <input
                    className="px-2 py-1 border rounded text-sm"
                    defaultValue={r.label}
                    onBlur={(e) => {
                      const v = e.currentTarget.value.trim();
                      if (v && v !== r.label) updateReasonText(r.id, v);
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => deleteReason(r.id)} className="text-red-600 hover:underline text-sm">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



    </div>
  );
}
