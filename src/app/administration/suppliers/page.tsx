'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Supplier = any; // keep flexible — adapt types if you want stricter typing

export default function AdminSupplierList() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [query, setQuery] = useState('');
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // modals
  const [showDetailsFor, setShowDetailsFor] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState<{
    mode: 'reject' | 'request' | 'approve' | null;
    supplierId?: string | null;
  }>({ mode: null });
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/supplier', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load suppliers');
      const json = await res.json();

      const supplierList = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
          ? json.data
          : [];

      setSuppliers(supplierList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      setLoadingFor(id, true);
      const res = await fetch(`/api/supplier?id=${id}`);
      if (res.ok) {
        const fullDetails = await res.json();
        // Update local state with full details for this supplier
        setSuppliers(prev => prev.map(s => s.id === id ? fullDetails : s));
        setShowDetailsFor(id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFor(id, false);
    }
  };

  // helper to set loading per supplier
  const setLoadingFor = (id: string, v: boolean) => setLoadingMap(prev => ({ ...prev, [id]: v }));

  const handleApprove = async (supplierId: string) => {
    if (!confirm('Approve this supplier? This will make their status APPROVED and allow onboarding.')) return;
    try {
      setLoadingFor(supplierId, true);
      const res = await fetch(`/api/supplier/${supplierId}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error('Approve failed');
      await fetchSuppliers();
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setLoadingFor(supplierId, false);
    }
  };

  const openRejectModal = (supplierId: string) => {
    setShowActionModal({ mode: 'reject', supplierId });
    setActionMessage('');
  };

  const openRequestInfoModal = (supplierId: string) => {
    setShowActionModal({ mode: 'request', supplierId });
    setActionMessage('Please provide more information about...');
  };

  const handlePerformAction = async () => {
    const { mode, supplierId } = showActionModal as any;
    if (!mode || !supplierId) return;

    try {
      setLoadingFor(supplierId, true);
      let res: Response;
      if (mode === 'reject') {
        res = await fetch(`/api/supplier/${supplierId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: actionMessage }),
        });
      } else if (mode === 'request') {
        res = await fetch(`/api/supplier/${supplierId}/request-info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: actionMessage }),
        });
      } else if (mode === 'approve') {
        res = await fetch(`/api/supplier/${supplierId}/approve`, { method: 'POST' });
      } else {
        throw new Error('Unknown action');
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Action failed');
      }

      setShowActionModal({ mode: null });
      setActionMessage('');
      await fetchSuppliers();
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed');
    } finally {
      if (showActionModal?.supplierId) setLoadingFor(showActionModal.supplierId, false);
    }
  };

  const handleDelete = async (supplierId: string) => {
    if (!confirm('Permanently delete this supplier and all related data? This cannot be undone.')) return;
    try {
      setLoadingFor(supplierId, true);
      const res = await fetch(`/api/supplier/${supplierId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchSuppliers();
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Delete error');
    } finally {
      setLoadingFor(supplierId, false);
    }
  };

  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      if (filterStatus !== 'all' && (s.status || '').toLowerCase() !== filterStatus) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        s.companyName?.toLowerCase().includes(q) ||
        s.registrationEmail?.toLowerCase().includes(q) ||
        s.registrationReference?.toLowerCase().includes(q)
      );
    });
  }, [suppliers, filterStatus, query]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Suppliers — Admin Review</h1>
        <div className="flex items-center gap-3">
          <Link href="/administration/suppliers/create" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ Create</Link>
          <button onClick={fetchSuppliers} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-2 items-center">
          <label className="text-sm">Filter:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="border rounded px-2 py-1">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex-1">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email or reference" className="w-full border rounded px-3 py-2" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6">#</th>
              <th className="py-3 px-6">Company</th>
              <th className="py-3 px-6">Email</th>
              <th className="py-3 px-6">Submitted</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6">Reference</th>
              <th className="py-3 px-6">Docs</th>
              <th className="py-3 px-6">Actions</th>
            </tr>
          </thead>

          <tbody className="text-gray-700 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-400">No suppliers found.</td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-6 align-top">{i + 1}</td>
                  <td className="py-3 px-6 align-top">
                    <div className="font-semibold">{s.companyName}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.organizationType} · {s.supplierType}</div>
                  </td>
                  <td className="py-3 px-6 align-top">{s.registrationEmail}</td>
                  <td className="py-3 px-6 align-top">{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : new Date(s.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-6 align-top">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${['approved', 'active'].includes((s.status || '').toLowerCase()) ? 'bg-green-100 text-green-800' : (s.status || '').toLowerCase() === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{(s.status || 'pending').toUpperCase()}</span>
                  </td>
                  <td className="py-3 px-6 align-top">{s.registrationReference || '-'}</td>
                  <td className="py-3 px-6 align-top">
                    <div className="text-xs text-gray-600">Contacts: {s.contacts?.length || 0}</div>
                    <div className="text-xs text-gray-600">Docs: {s.businessDocuments?.length || 0}</div>
                    <div className="text-xs text-gray-600">Banks: {s.bankAccounts?.length || 0}</div>
                  </td>
                  <td className="py-3 px-6 align-top space-x-2">
                    <button onClick={() => handleViewDetails(s.id)} disabled={loadingMap[s.id]} className="text-sm px-3 py-1 bg-white border rounded disabled:opacity-50">{loadingMap[s.id] && showDetailsFor !== s.id ? 'Loading...' : 'View'}</button>
                    {['approved', 'active'].includes((s.status || '').toLowerCase()) ? (
                      <Link href={`/administration/suppliers/${s.id}`} className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Edit</Link>
                    ) : (
                      <>
                        <button onClick={() => handleApprove(s.id)} disabled={loadingMap[s.id]} className="text-sm px-3 py-1 bg-green-600 text-white rounded disabled:opacity-60">{loadingMap[s.id] ? '...' : 'Approve'}</button>
                        <button onClick={() => openRejectModal(s.id)} className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded">Reject</button>
                        <button onClick={() => openRequestInfoModal(s.id)} className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded">Request Info</button>
                      </>
                    )}
                    <button onClick={() => handleDelete(s.id)} className="text-sm px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Drawer/Modal */}
      {showDetailsFor && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-t-lg md:rounded-lg w-full md:w-3/4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Supplier Details</h3>
              <div className="flex gap-2">
                <button onClick={() => { setShowDetailsFor(null); }} className="px-3 py-1 border rounded">Close</button>
                <Link href={`/administration/suppliers/${showDetailsFor}`} className="px-3 py-1 bg-blue-600 text-white rounded">Open Profile</Link>
              </div>
            </div>

            <SupplierDetails supplier={suppliers.find(x => x.id === showDetailsFor)} />
          </div>
        </div>
      )}

      {/* Action Modal (reject / request info) */}
      {showActionModal.mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg w-[520px] p-6">
            <h4 className="text-lg font-semibold mb-2">{showActionModal.mode === 'reject' ? 'Reject Supplier' : 'Request More Information'}</h4>
            <p className="text-sm text-gray-600 mb-4">Provide an optional message that will be sent to the supplier.</p>
            <textarea value={actionMessage} onChange={(e) => setActionMessage(e.target.value)} rows={6} className="w-full border rounded p-2" />

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowActionModal({ mode: null })} className="px-3 py-2 border rounded">Cancel</button>
              <button onClick={handlePerformAction} className="px-3 py-2 bg-blue-600 text-white rounded">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SupplierDetails({ supplier }: { supplier: Supplier | undefined }) {
  if (!supplier) return <div className="text-gray-500">Supplier not found</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Company</div>
          <div className="font-semibold">{supplier.companyName}</div>
          <div className="text-sm text-gray-600 mt-1">{supplier.organizationType} · {supplier.supplierType}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Email</div>
          <div className="font-semibold">{supplier.registrationEmail}</div>
          <div className="text-xs text-gray-500 mt-1">Reference: {supplier.registrationReference || '-'}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Status</div>
          <div className="font-semibold">{supplier.status}</div>
          <div className="text-xs text-gray-500 mt-1">Submitted: {supplier.submittedAt ? new Date(supplier.submittedAt).toLocaleString() : '-'}</div>
        </div>
        <div className="border rounded p-3 col-span-1 md:col-span-3">
          <div className="text-xs text-gray-500">Product Categories</div>
          <div className="flex flex-wrap gap-2 mt-1">
            {supplier.productCategories && supplier.productCategories.length > 0 ? (
              supplier.productCategories.map((pc: any, idx: number) => (
                <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-100">
                  {pc.productCategory?.name || "Unknown"}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-sm italic">No categories assigned</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Contacts" items={supplier.contacts || []} renderItem={(c: any) => (
          <div>
            <div className="font-semibold">{c.firstName} {c.lastName}</div>
            <div className="text-xs text-gray-600">{c.designation} · {c.mobile}</div>
          </div>
        )} />

        <Panel title="Addresses" items={supplier.addresses || []} renderItem={(a: any) => (
          <div>
            <div className="font-semibold">{a.type} — {a.city}, {a.country}</div>
            <div className="text-xs text-gray-600">{a.line1} {a.line2 || ''}</div>
          </div>
        )} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Business Documents" items={supplier.businessDocuments || []} renderItem={(d: any) => (
          <div>
            <div className="font-semibold">{d.classification} — {d.certificateNumber || ''}</div>
            <div className="text-xs text-gray-600">Expires: {d.certificateEndDate ? new Date(d.certificateEndDate).toLocaleDateString() : '—'}</div>
          </div>
        )} />

        <Panel title="Bank Accounts" items={supplier.bankAccounts || []} renderItem={(b: any) => (
          <div>
            <div className="font-semibold">{b.bankName} — {b.accountNumber}</div>
            <div className="text-xs text-gray-600">{b.currency} · {b.accountHolder}</div>
          </div>
        )} />
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">Attachments & Files</h4>
        <div className="flex gap-2 flex-wrap">
          {(supplier.profileAttachments || []).map((p: string, i: number) => (
            <a key={i} href={p} target="_blank" rel="noreferrer" className="text-xs underline">File {i + 1}</a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, items, renderItem }: { title: string; items: any[]; renderItem: (item: any) => React.ReactNode }) {
  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-gray-500">{items.length}</div>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? <div className="text-xs text-gray-500 italic">None</div> : items.map((it, idx) => (
          <div key={idx} className="text-sm">{renderItem(it)}</div>
        ))}
      </div>
    </div>
  );
}
