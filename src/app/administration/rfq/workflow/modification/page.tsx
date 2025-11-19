"use client";
import React, { useEffect, useState, useMemo } from "react";

/**
 * Admin page: Modification rules
 * - Shows a full list of RFQ fields (from the RFQ edit form)
 * - Allows toggling editable / requiresApproval / notifySuppliers per field
 * - Save/load to /api/admin/modification-rules
 *
 * Paste to: app/admin/modification/page.tsx
 */

type FieldRule = {
  id: string;            // internal id (use fieldKey if available)
  fieldKey: string;      // canonical field key used in RFQ payloads
  label: string;         // human label
  editable: boolean;
  requiresApproval: boolean;
  notifySuppliers: boolean;
  description?: string;
};

type Approver = {
  id: string;
  name: string;
  email?: string;
  order?: number;
  isParallel?: boolean;
};

type ConfigPayload = {
  id?: string;
  name?: string;
  fields: FieldRule[];
  approvers?: Approver[];
  notifyAllSuppliersOnAnyChange?: boolean;
  supplierNotificationSubject?: string;
  supplierNotificationBody?: string;
};

// Canonical fields (derived from your RFQ edit form). Add/remove as needed.
const CANONICAL_FIELDS: FieldRule[] = [
  { id: "title", fieldKey: "title", label: "RFQ Title", editable: true, requiresApproval: true, notifySuppliers: false, description: "The title of the RFQ" },
  { id: "rfqId", fieldKey: "rfqId", label: "RFQ ID", editable: false, requiresApproval: false, notifySuppliers: false },
  { id: "openDateTime", fieldKey: "openDateTime", label: "Open Date & Time", editable: false, requiresApproval: false, notifySuppliers: false },
  { id: "closeDateTime", fieldKey: "closeDateTime", label: "Close Date & Time", editable: true, requiresApproval: true, notifySuppliers: true },
  { id: "closeDateType", fieldKey: "closeDateType", label: "Close Date Type (fixed / days)", editable: true, requiresApproval: true, notifySuppliers: false },
  { id: "daysAfterOpen", fieldKey: "daysAfterOpen", label: "Days After Open (working days)", editable: true, requiresApproval: true, notifySuppliers: false },
  { id: "needByDate", fieldKey: "needByDate", label: "Need By Date", editable: true, requiresApproval: false, notifySuppliers: false },
  { id: "requesterReference", fieldKey: "requesterReference", label: "Requester Reference", editable: true, requiresApproval: false, notifySuppliers: false },
  { id: "shippingAddress", fieldKey: "shippingAddress", label: "Shipping Address", editable: true, requiresApproval: false, notifySuppliers: false },
  { id: "paymentProcess", fieldKey: "paymentProcess", label: "Payment Process", editable: true, requiresApproval: false, notifySuppliers: false },
  { id: "currency", fieldKey: "currency", label: "Currency", editable: true, requiresApproval: false, notifySuppliers: false },
  { id: "shippingType", fieldKey: "shippingType", label: "Shipping Type", editable: true, requiresApproval: false, notifySuppliers: false },
  { id: "carrier", fieldKey: "carrier", label: "Carrier", editable: true, requiresApproval: false, notifySuppliers: false },
  { id: "negotiationControls", fieldKey: "negotiationControls", label: "Negotiation Controls (sealed/unsealed)", editable: true, requiresApproval: true, notifySuppliers: true },
  { id: "incoterms", fieldKey: "incoterms", label: "Incoterms", editable: true, requiresApproval: false, notifySuppliers: false },
  { id: "noteToSupplier", fieldKey: "noteToSupplier", label: "Note to Supplier", editable: true, requiresApproval: false, notifySuppliers: true },
  { id: "productSpecification", fieldKey: "productSpecification", label: "Product Specification", editable: true, requiresApproval: false, notifySuppliers: false },
  { id: "categoryIds", fieldKey: "categoryIds", label: "Categories (customerCategory)", editable: true, requiresApproval: true, notifySuppliers: true },
  { id: "items", fieldKey: "items", label: "Line Items", editable: true, requiresApproval: true, notifySuppliers: true, description: "Add/delete/modify line items" },
  { id: "suppliersSelected", fieldKey: "suppliersSelected", label: "Selected Suppliers", editable: true, requiresApproval: true, notifySuppliers: true },
  { id: "publishOnApproval", fieldKey: "publishOnApproval", label: "Publish upon Approval", editable: true, requiresApproval: true, notifySuppliers: false },
  { id: "attachmentPath", fieldKey: "attachmentPath", label: "Attachments", editable: true, requiresApproval: false, notifySuppliers: false },
  { id: "requester", fieldKey: "requester", label: "Requester (owner)", editable: false, requiresApproval: false, notifySuppliers: false },
  // custom / extension fields often used
  { id: "productCategory", fieldKey: "productCategory", label: "Product Category", editable: true, requiresApproval: false, notifySuppliers: false },
  { id: "uoms", fieldKey: "uoms", label: "Unit of Measure (items.uom)", editable: true, requiresApproval: false, notifySuppliers: false },
];

export default function ModificationAdminPage() {
  const [fields, setFields] = useState<FieldRule[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notifyAllOnChange, setNotifyAllOnChange] = useState<boolean>(true);

  // load saved config (if any) and merge with canonical fields
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/modification-rules");
        if (!res.ok) {
          // fallback to canonical list
          if (mounted) {
            setFields(CANONICAL_FIELDS);
            setApprovers([]);
            setLoading(false);
          }
          return;
        }
        const data: ConfigPayload = await res.json();
        // merge saved rules with canonical fields (preserve canonical order)
        const savedMap = new Map<string, FieldRule>();
        (data.fields || []).forEach((f) => savedMap.set(f.fieldKey || f.id, f));
        const merged = CANONICAL_FIELDS.map((cf) => {
          const s = savedMap.get(cf.fieldKey) || savedMap.get(cf.id);
          return s ? { ...cf, ...s } : cf;
        });

        // include any saved custom fields not in canonical list
        (data.fields || []).forEach((f) => {
          const exists = merged.some((m) => m.fieldKey === f.fieldKey || m.id === f.id);
          if (!exists) merged.push(f);
        });

        if (mounted) {
          setFields(merged);
          setApprovers(data.approvers || []);
          setNotifyAllOnChange(!!data.notifyAllSuppliersOnAnyChange);
        }
      } catch (err) {
        console.error("Failed to load modification rules", err);
        if (mounted) setFields(CANONICAL_FIELDS);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter((f) => f.label.toLowerCase().includes(q) || f.fieldKey.toLowerCase().includes(q));
  }, [fields, query]);

  const toggleFieldFlag = (fieldKey: string, flag: keyof Pick<FieldRule, "editable" | "requiresApproval" | "notifySuppliers">) => {
    setFields((prev) => prev.map((f) => f.fieldKey === fieldKey ? ({ ...f, [flag]: !f[flag] }) : f));
  };

  const addCustomField = () => {
    const id = `custom_${Date.now()}`;
    const newField: FieldRule = { id, fieldKey: id, label: "New Custom Field", editable: true, requiresApproval: false, notifySuppliers: false, description: "" };
    setFields((prev) => [...prev, newField]);
  };

  const removeField = (fieldKey: string) => {
    if (!confirm("Remove this field rule? This won't delete the RFQ data — only the admin rule.")) return;
    setFields((prev) => prev.filter((f) => f.fieldKey !== fieldKey));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload: ConfigPayload = {
        name: "Default Modification Rules",
        fields,
        approvers,
        notifyAllSuppliersOnAnyChange: notifyAllOnChange,
      };
      const res = await fetch("/api/admin/modification-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      alert('Rules Changed');
      setMessage("Saved configuration successfully.");
    } catch (err: any) {
      console.error("Save failed", err);
      setMessage("Save failed: " + (err?.message || "unknown"));
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const bulkSet = (flag: keyof Pick<FieldRule, "editable" | "requiresApproval" | "notifySuppliers">, value: boolean) => {
    setFields((prev) => prev.map((f) => ({ ...f, [flag]: value })));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Modification Rules — Fields</h1>
          <p className="text-sm text-gray-600">Define which RFQ fields are editable when an event is published, which changes require re-approval, and whether suppliers should be notified.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* <button onClick={() => { setFields(CANONICAL_FIELDS); setMessage("Reset to canonical fields"); }} className="px-3 py-1 rounded bg-gray-100">Reset fields</button> */}
          {/* <button onClick={() => { bulkSet("requiresApproval", true); setMessage("Marked all fields as requiring approval"); }} className="px-3 py-1 rounded bg-yellow-50 text-yellow-800">Require approval (all)</button> */}
          <button onClick={() => save()} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60" disabled={saving}>{saving ? "Saving..." : "Save rules"}</button>
        </div>
      </div>

      {loading ? (
        <div className="p-4 bg-white rounded shadow text-sm">Loading...</div>
      ) : (
        <>
          <div className="bg-white border rounded p-4">
            <div className="flex items-center gap-3 mb-4">
              {/* <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search fields..." className="flex-1 px-3 py-2 rounded border" /> */}
              {/* <button onClick={addCustomField} className="px-3 py-2 rounded bg-green-50 text-green-700">+ Add custom field</button> */}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={notifyAllOnChange} onChange={(e) => setNotifyAllOnChange(e.target.checked)} />
                Notify all suppliers when any modification is approved
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-600 border-b">
                    <th className="p-2">Field</th>
                    <th className="p-2">Key</th>
                    <th className="p-2">Editable</th>
                    <th className="p-2">Requires approval</th>
                    <th className="p-2">Notify suppliers</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.fieldKey} className="border-b even:bg-gray-50">
                      <td className="p-2 align-top">
                        <div className="font-medium">{f.label}</div>
                        {f.description ? <div className="text-xs text-gray-500 mt-1">{f.description}</div> : null}
                      </td>
                      <td className="p-2 align-top text-xs text-gray-600">{f.fieldKey}</td>
                      <td className="p-2 align-top">
                        <input type="checkbox" checked={f.editable} onChange={() => toggleFieldFlag(f.fieldKey, "editable")} />
                      </td>
                      <td className="p-2 align-top">
                        <input type="checkbox" checked={f.requiresApproval} onChange={() => toggleFieldFlag(f.fieldKey, "requiresApproval")} />
                      </td>
                      <td className="p-2 align-top">
                        <input type="checkbox" checked={f.notifySuppliers} onChange={() => toggleFieldFlag(f.fieldKey, "notifySuppliers")} />
                      </td>
                      <td className="p-2 align-top">
                        <div className="flex gap-2">
                          <button onClick={() => {
                            const newLabel = prompt("Field label", f.label);
                            if (newLabel !== null) {
                              setFields((prev) => prev.map(p => p.fieldKey === f.fieldKey ? ({ ...p, label: newLabel }) : p));
                            }
                          }} className="px-2 py-1 bg-gray-100 rounded text-xs">Rename</button>

                          <button onClick={() => removeField(f.fieldKey)} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {message && <div className="mt-3 text-sm text-green-700">{message}</div>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border rounded p-4">
              <h3 className="font-semibold">Preview: editable fields</h3>
              <ul className="mt-2 text-sm list-disc pl-5 text-gray-700">
                {fields.filter(f => f.editable).length === 0 ? <li className="text-xs text-gray-500">No fields editable</li> :
                  fields.filter(f => f.editable).map(f => <li key={f.fieldKey}>{f.label} <span className="text-xs text-gray-400">({f.fieldKey})</span></li>)}
              </ul>
            </div>

            <div className="bg-white border rounded p-4">
              <h3 className="font-semibold">Preview: require approval</h3>
              <ul className="mt-2 text-sm list-disc pl-5 text-gray-700">
                {fields.filter(f => f.requiresApproval).length === 0 ? <li className="text-xs text-gray-500">No fields require approval</li> :
                  fields.filter(f => f.requiresApproval).map(f => <li key={f.fieldKey}>{f.label}</li>)}
              </ul>
            </div>

            <div className="bg-white border rounded p-4">
              <h3 className="font-semibold">Preview: notify suppliers</h3>
              <ul className="mt-2 text-sm list-disc pl-5 text-gray-700">
                {fields.filter(f => f.notifySuppliers).length === 0 ? <li className="text-xs text-gray-500">No fields notify suppliers</li> :
                  fields.filter(f => f.notifySuppliers).map(f => <li key={f.fieldKey}>{f.label}</li>)}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
