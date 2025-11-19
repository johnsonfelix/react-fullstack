"use client";

import React, { useEffect, useState } from "react";

type RequestItem = {
  id: string;
  internalPartNo?: string;
  manufacturer?: string;
  mfgPartNo?: string;
  description: string;
  uom: string;
  quantity: number;
};

type BRFQ = {
  id: string;
  rfqId: string;
  title: string;
  requester?: string;
  createdAt?: string;
  approvalStatus?: string;
  publishOnApproval?: boolean;
  published?: boolean;
  status?: string;
  items?: RequestItem[];
  suppliersSelected?: string[];
  notesToSupplier?: string;
};

type ModificationRequest = {
  id: string;
  brfqId: string;
  requestedBy?: string;
  requestedAt?: string;
  requestedFields?: string[];
  summary?: Record<string, any>;
  note?: string;
  status?: string; // pending|approved|rejected
};

export default function AdminApprovalsPage() {
  const [brfqs, setBrfqs] = useState<BRFQ[]>([]);
  const [modRequests, setModRequests] = useState<ModificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMods, setLoadingMods] = useState(false);

  const [selected, setSelected] = useState<BRFQ | null>(null);
  const [selectedMod, setSelectedMod] = useState<ModificationRequest | null>(null);

  const [note, setNote] = useState("");
  const [publishOverride, setPublishOverride] = useState<boolean | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Refresh both lists
  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/brfqs`);
      if (!res.ok) throw new Error("Failed to load RFQs");
      const json = await res.json();
      setBrfqs(json.data || []);
    } catch (err) {
      console.error(err);
      alert("Could not load pending approvals");
    } finally {
      setLoading(false);
    }
  };

  const fetchModRequests = async () => {
    setLoadingMods(true);
    try {
      const res = await fetch(`/api/admin/modification-requests`);
      if (!res.ok) throw new Error("Failed to load modification requests");
      const json = await res.json();
      setModRequests(json.data || []);
    } catch (err) {
      console.error(err);
      // gracefully continue
    } finally {
      setLoadingMods(false);
    }
  };

  useEffect(() => {
    fetchPending();
    fetchModRequests();
  }, []);

  const openDetail = (b: BRFQ) => {
    setSelected(b);
    setNote("");
    setPublishOverride(null);
  };

  const closeDetail = () => setSelected(null);

  const openModDetail = (m: ModificationRequest) => {
    setSelectedMod(m);
    setNote(m.note || "");
    setPublishOverride(null);
  };

  const closeModDetail = () => setSelectedMod(null);

  const performAction = async (action: "approve" | "reject") => {
    if (!selected) return;
    if (action === "reject" && !confirm("Are you sure you want to reject this RFQ?")) return;

    setActionLoading(true);
    try {
      const endpoint = `/api/admin/brfqs/${selected.id}/${action}`;
      const payload: any = { note };
      if (action === "approve") {
        if (publishOverride !== null) payload.publishOverride = publishOverride;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Action failed");
      }

      alert(`${action === "approve" ? "Approved" : "Rejected"} successfully`);
      await fetchPending();
      closeDetail();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Approve / Reject modification request
  const performModAction = async (action: "approve" | "reject") => {
    if (!selectedMod) return;
    if (action === "reject" && !confirm("Are you sure you want to reject this modification request?")) return;

    setActionLoading(true);
    try {
      const endpoint = `/api/admin/modification-requests/${selectedMod.id}/${action}`;
      const payload: any = { note };
      if (action === "approve") {
        if (publishOverride !== null) payload.publishOverride = publishOverride;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Action failed");
      }

      alert(`Modification request ${action === "approve" ? "approved" : "rejected"} successfully`);
      await fetchPending();
      await fetchModRequests();
      closeModDetail();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  // quick approve helper for RFQs (same UI earlier)
  const quickApproveRFQ = async (b: BRFQ, publish: boolean) => {
    setSelected(b);
    setPublishOverride(publish);
    // tiny delay so state updates before call (not strictly necessary)
    setTimeout(() => performAction("approve"), 50);
  };

  // Render helper: pretty-print modification summary / diff
  const renderSummary = (summary?: Record<string, any>) => {
    if (!summary || Object.keys(summary).length === 0) return <div className="text-sm text-gray-500">No diff provided.</div>;
    return (
      <div className="space-y-2">
        {Object.entries(summary).map(([key, val]) => {
          // if val has from/to show clearly, otherwise stringify
          if (val && typeof val === "object" && ("from" in val || "to" in val)) {
            return (
              <div key={key} className="p-2 border rounded bg-gray-50">
                <div className="font-medium">{key}</div>
                <div className="text-xs text-gray-600 mt-1"><strong>From:</strong> <pre className="inline">{JSON.stringify((val as any).from, null, 0)}</pre></div>
                <div className="text-xs text-gray-600"><strong>To:</strong> <pre className="inline">{JSON.stringify((val as any).to, null, 0)}</pre></div>
              </div>
            );
          }
          return (
            <div key={key} className="p-2 border rounded bg-gray-50">
              <div className="font-medium">{key}</div>
              <div className="text-xs text-gray-600 mt-1">{JSON.stringify(val)}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">Approvals</h1>
        <div className="flex gap-2">
          <button onClick={fetchPending} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={loading}>
            Refresh RFQs
          </button>
          <button onClick={fetchModRequests} className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" disabled={loadingMods}>
            Refresh Mod Requests
          </button>
        </div>
      </div>

      {/* Pending modification requests */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Pending Modification Requests {loadingMods ? "(loading...)" : `(${modRequests.length})`}</h2>
        {modRequests.length === 0 ? (
          <div className="text-sm text-gray-500 mb-4">No pending modification requests.</div>
        ) : (
          <div className="space-y-3">
            {modRequests.map((m) => (
              <div key={m.id} className="p-3 bg-white border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{m.brfqId} <span className="text-sm text-gray-500">• requested by {m.requestedBy || "—"}</span></div>
                  <div className="text-sm text-gray-600">{m.requestedFields?.join(", ") || "Fields changed"} • {new Date(m.requestedAt || "").toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openModDetail(m)} className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200">View</button>
                  <button onClick={() => { openModDetail(m); setPublishOverride(true); setTimeout(() => performModAction("approve"), 50); }} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">Quick Approve & Publish</button>
                  <button onClick={() => { openModDetail(m); setPublishOverride(false); setTimeout(() => performModAction("approve"), 50); }} className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">Quick Approve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending RFQ approvals */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Pending RFQ Approvals {loading ? "(loading...)" : `(${brfqs.length})`}</h2>
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : brfqs.length === 0 ? (
          <div className="text-sm text-gray-500">No pending approvals</div>
        ) : (
          <div className="grid gap-4">
            {brfqs.map((b) => (
              <div key={b.id} className="p-4 bg-white rounded shadow flex justify-between items-center">
                <div>
                  <div className="font-semibold">{b.title} <span className="text-xs text-gray-500">({b.rfqId})</span></div>
                  <div className="text-sm text-gray-600">Requested by: {b.requester || '—'} • {new Date(b.createdAt || '').toLocaleString()}</div>
                  <div className="text-sm">Status: <span className="font-medium">{b.approvalStatus || 'none'}</span> {b.publishOnApproval ? <span className="ml-3 inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">Auto Publish</span> : null}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => openDetail(b)} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm">View</button>
                  <button onClick={() => quickApproveRFQ(b, true)} className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">Quick Approve & Publish</button>
                  <button onClick={() => quickApproveRFQ(b, false)} className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm">Quick Approve (No Publish)</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal (RFQ) */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-3xl rounded shadow p-6 overflow-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selected.title} <span className="text-sm text-gray-500">({selected.rfqId})</span></h2>
                <div className="text-sm text-gray-600">Requested by: {selected.requester || '—'}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={closeDetail} className="text-sm text-gray-600 hover:underline">Close</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selected.items?.map((it) => (
                    <div key={it.id} className="p-2 border rounded">
                      <div className="font-medium">{it.description}</div>
                      <div className="text-xs text-gray-600">Qty: {it.quantity} {it.uom} • Part: {it.internalPartNo || '—'}</div>
                    </div>
                  )) || <div className="text-sm text-gray-500">No items</div>}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Approval</h3>
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Note (optional)</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full border p-2 rounded" rows={4} />
                </div>

                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={publishOverride === true} onChange={() => setPublishOverride(true)} />
                    <span className="text-sm">Force Publish on Approve</span>
                  </label>
                  <label className="flex items-center gap-2 mt-1">
                    <input type="checkbox" checked={publishOverride === false} onChange={() => setPublishOverride(false)} />
                    <span className="text-sm">Force Do Not Publish on Approve</span>
                  </label>
                  <div className="text-xs text-gray-500 mt-1">If neither toggled, the RFQ's <code>publishOnApproval</code> value will be used.</div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => performAction("approve")} disabled={actionLoading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
                  <button onClick={() => performAction("reject")} disabled={actionLoading} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Reject</button>
                  <button onClick={() => { closeDetail(); }} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modification Request Modal */}
      {selectedMod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-3xl rounded shadow p-6 overflow-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Modification Request for {selectedMod.brfqId}</h2>
                <div className="text-sm text-gray-600">Requested by: {selectedMod.requestedBy || "—"} • {new Date(selectedMod.requestedAt || "").toLocaleString()}</div>
              </div>
              <div>
                <button onClick={closeModDetail} className="text-sm text-gray-600 hover:underline">Close</button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Requested fields</h3>
                <div className="text-sm text-gray-700">{(selectedMod.requestedFields || []).join(", ") || "—"}</div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Summary / Diff</h3>
                <div className="mb-2">
                  {renderSummary(selectedMod.summary)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Note (optional)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full border p-2 rounded" rows={4} />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={publishOverride === true} onChange={() => setPublishOverride(true)} />
                  <span className="text-sm">Force Publish on Approve</span>
                </label>
                <label className="flex items-center gap-2 mt-1">
                  <input type="checkbox" checked={publishOverride === false} onChange={() => setPublishOverride(false)} />
                  <span className="text-sm">Force Do Not Publish on Approve</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button onClick={() => performModAction("approve")} disabled={actionLoading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Approve Modification</button>
                <button onClick={() => performModAction("reject")} disabled={actionLoading} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Reject Modification</button>
                <button onClick={() => closeModDetail()} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
