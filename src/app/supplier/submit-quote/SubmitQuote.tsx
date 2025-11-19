// app/(whatever)/SubmitQuote.tsx (or wherever you keep it)
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SubmitQuote() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [tokenPayload, setTokenPayload] = useState<{ rfqId: string; supplierId: string } | null>(null);
  const [rfqDetails, setRfqDetails] = useState<any>(null);
  const [supplierName, setSupplierName] = useState('');
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [uoms, setUoms] = useState<string[]>([]);
  const [quoteData, setQuoteData] = useState<any[]>([]);
  const [fullAddress, setFullAddress] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [validFor, setValidFor] = useState('');
  const [supplierQuoteNo, setSupplierQuoteNo] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]); // RFQ attachments
  const [newFiles, setNewFiles] = useState<File[]>([]); // files to send with quote

  useEffect(() => {
    if (!rfqDetails?.closeDate) return;
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(rfqDetails.closeDate);
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [rfqDetails?.closeDate]);

  useEffect(() => {
    const verifyAndFetchRFQ = async () => {
      if (!token) return;
      try {
        const res = await fetch(`/api/lib/verify-quote-token?token=${encodeURIComponent(token)}`);
        if (!res.ok) throw new Error('Token verification failed');
        const data = await res.json();
        if (!data?.rfqId || !data?.supplierId) throw new Error('Invalid token payload');
        setTokenPayload({ rfqId: data.rfqId, supplierId: data.supplierId });

        const rfqRes = await fetch(`/api/brfq/${encodeURIComponent(data.rfqId)}`);
        if (!rfqRes.ok) throw new Error('Failed to fetch RFQ');
        let rfq = await rfqRes.json();
        if (rfq?.data) rfq = rfq.data;
        setRfqDetails(rfq);

        // attachments
        if (rfq.attachmentPath) {
          if (Array.isArray(rfq.attachmentPath)) setAttachments(rfq.attachmentPath);
          else if (typeof rfq.attachmentPath === 'string') {
            try {
              const parsed = JSON.parse(rfq.attachmentPath);
              if (Array.isArray(parsed)) setAttachments(parsed);
              else setAttachments(rfq.attachmentPath.split('|').filter(Boolean));
            } catch {
              setAttachments(rfq.attachmentPath.split('|').filter(Boolean));
            }
          }
        } else if (rfq.attachments) {
          setAttachments(Array.isArray(rfq.attachments) ? rfq.attachments : []);
        } else {
          setAttachments([]);
        }

        setSelectedCurrency(rfq.currency || '');

        if (rfq.shippingAddress) {
          try {
            const addressRes = await fetch(`/api/address/${encodeURIComponent(rfq.shippingAddress)}`);
            if (addressRes.ok) {
              const address = await addressRes.json();
              const formatted = [
                address.line1 ?? address.line ?? '',
                address.city ?? '',
                address.state ?? '',
                address.zip ?? address.zipCode ?? '',
                address.country ?? '',
              ].filter(Boolean).join(', ');
              setFullAddress(formatted);
            }
          } catch (err) { console.warn('Failed to fetch address', err); }
        }

        // supplier name resolution
        let supplierNameFound = '';
        try {
          let suppliersSelected = rfq.suppliersSelected;
          if (typeof suppliersSelected === 'string') {
            try { suppliersSelected = JSON.parse(suppliersSelected); } catch {}
          }
          if (Array.isArray(suppliersSelected)) {
            const found = suppliersSelected.find((s: any) => {
              if (!s) return false;
              if (typeof s === 'string') return String(s) === String(data.supplierId);
              if (typeof s === 'object') return String(s.id) === String(data.supplierId);
              return false;
            });
            if (found) {
              const obj = typeof found === 'string' ? null : found;
              const name = obj?.name ?? obj?.companyName ?? (obj?.firstName ? `${obj.firstName} ${obj.lastName ?? ''}`.trim() : null);
              const email = obj?.email ?? obj?.registrationEmail ?? obj?.user?.email ?? null;
              supplierNameFound = name ?? (email ? email.split('@')[0] : data.supplierId);
            }
          }
        } catch (err) { console.warn('Error resolving supplier from RFQ', err); }

        if (!supplierNameFound) {
          try {
            const supplierRes = await fetch(`/api/suppliers/${encodeURIComponent(data.supplierId)}`);
            if (supplierRes.ok) {
              let s = await supplierRes.json();
              if (s?.data) s = s.data;
              supplierNameFound = s?.name ?? s?.companyName ?? (s?.registrationEmail ? s.registrationEmail.split('@')[0] : data.supplierId);
            } else supplierNameFound = data.supplierId;
          } catch { supplierNameFound = data.supplierId; }
        }
        setSupplierName(supplierNameFound);

        // prepare quote rows
        const itemsArr = Array.isArray(rfq.items) ? rfq.items : (rfq.data?.items ?? []);
        setQuoteData(
          (itemsArr || []).map((item: any, idx: number) => ({
            itemRef: item.internalPartNo ?? item.itemNumber ?? item.id ?? `line-${idx + 1}`,
            itemIndex: idx,
            deliveryDays: '',
            unitPrice: '',
            qty: String(item.quantity ?? item.qty ?? item.estQuantity ?? ''),
            uom: item.uom ?? '',
            cost: 0
          }))
        );

        // load currencies & uoms
        try {
          const currencyRes = await fetch(`/api/administration/fields/currency`);
          if (currencyRes.ok) {
            const currencyList = await currencyRes.json();
            setCurrencies((currencyList || []).map((c: any) => c.name ?? String(c)));
          }
        } catch {}
        try {
          const uomRes = await fetch(`/api/administration/fields/uom`);
          if (uomRes.ok) {
            const uomList = await uomRes.json();
            setUoms((uomList || []).map((u: any) => u.name ?? String(u)));
          }
        } catch {}
      } catch (err) {
        console.error('Verification or RFQ fetch failed:', err);
      }
    };
    verifyAndFetchRFQ();
  }, [token]);

  const getFileIcon = (filename: string | undefined) => {
    const ext = (filename || '').split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc': case 'docx': return '📝';
      case 'xls': case 'xlsx': return '📊';
      case 'jpg': case 'jpeg': case 'png': return '🖼️';
      default: return '📎';
    }
  };

  if (!tokenPayload || !rfqDetails) return <div className="p-4">Verifying token or loading RFQ...</div>;

  const handleQuoteInputChange = (index: number, field: string, value: string) => {
    setQuoteData((prev) => {
      const updated = [...prev];
      const row = { ...(updated[index] ?? {}) };
      row[field] = value;
      const price = parseFloat((field === 'unitPrice' ? value : (row.unitPrice || '0')) || '0');
      const qty = parseFloat((field === 'qty' ? value : (row.qty || '0')) || '0');
      row.cost = Number.isFinite(price) && Number.isFinite(qty) ? price * qty : 0;
      updated[index] = row;
      return updated;
    });
  };

  const onNewFilesChange = (files: FileList | null) => {
    if (!files) return;
    setNewFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const removeNewFileAt = (idx: number) => setNewFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedCurrency) { alert('Please select currency'); return; }

    const payload = {
      token,
      rfqId: tokenPayload?.rfqId,
      supplierId: tokenPayload?.supplierId,
      supplierQuoteNo,
      validFor,
      currency: selectedCurrency,
      items: quoteData.map((r) => ({
        itemRef: r.itemRef,
        deliveryDays: r.deliveryDays,
        unitPrice: r.unitPrice,
        qty: r.qty,
        uom: r.uom,
        cost: r.cost
      })),
      comments: e.target.comments?.value ?? '',
      shipping: e.target.shipping?.value ?? ''
    };

    try {
      if (newFiles.length > 0) {
        const fd = new FormData();
        fd.append('payload', JSON.stringify(payload));
        newFiles.forEach((f) => fd.append('files', f));
        fd.append('rfqAttachments', JSON.stringify(attachments || []));
        const res = await fetch('/api/suppliers/quote', { method: 'POST', body: fd });
        if (res.ok) { alert('Quote submitted successfully!'); }
        else { const txt = await res.text(); console.error('Submit failed', res.status, txt); alert('Failed to submit quote'); }
      } else {
        const res = await fetch('/api/suppliers/quote', {
  method: 'POST',
  body: JSON.stringify(payload),
  headers: newFiles.length === 0 ? { 'Content-Type': 'application/json' } : undefined,
});

if (res.ok) {
  alert('Quote submitted successfully!');
} else if (res.status === 409) {
  const body = await res.json().catch(() => ({}));
  alert(body?.error || 'You have already submitted a quote for this RFQ. Only one submission is allowed.');
} else {
  const txt = await res.text();
  console.error('Submit failed', res.status, txt);
  alert('Failed to submit quote. Check console for details.');
}
      }
    } catch (err) {
      console.error('Submit error', err);
      alert('Error submitting quote');
    }
  };

  return (
    <div className="relative max-w-7xl mx-auto p-6 bg-white shadow rounded-lg mt-8 space-y-6">
      <div className="absolute top-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded shadow text-sm font-semibold">
        Closes in: {timeLeft || 'calculating...'}
      </div>

      <h1 className="text-2xl font-bold mb-4">Submit Quote for: {rfqDetails.title ?? 'RFQ'} by {supplierName}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border p-4 rounded bg-gray-50 space-y-4">
          <div>
            <label className="block font-medium">Supplier Quote No</label>
            <input name="supplierQuoteNo" required className="border rounded px-3 py-2 w-full" value={supplierQuoteNo} onChange={(e) => setSupplierQuoteNo(e.target.value)} />
          </div>
          <div>
            <label className="block font-medium">Valid For</label>
            <select name="validFor" required className="border rounded px-3 py-2 w-full" value={validFor} onChange={(e) => setValidFor(e.target.value)}>
              <option value="">Select Valid Days</option>
              {[1,2,3,4,5,6,7,10,15,30].map(d => <option key={d} value={`${d} days`}>{`${d} day${d>1?'s':''}`}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-medium">Currency</label>
            <select name="currency" required className="border rounded px-3 py-2 w-full" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>
              <option value="">Select Currency</option>
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="border p-4 rounded bg-gray-50 space-y-2">
          <h2 className="text-lg font-semibold mb-2">RFQ Info</h2>
          <p><strong>Close Date:</strong> {rfqDetails.closeDate ? new Date(rfqDetails.closeDate).toLocaleString() : 'N/A'}</p>
          <p><strong>Urgency:</strong> {rfqDetails.urgency ?? 'N/A'}</p>
          <p><strong>Shipping Address:</strong> {fullAddress || 'N/A'}</p>
          <p><strong>Payment Process:</strong> {rfqDetails.paymentProcess ?? 'N/A'}</p>
          <p><strong>Notes to Supplier:</strong> {rfqDetails.noteToSupplier ?? rfqDetails.notesToSupplier ?? 'N/A'}</p>
        </div>

        <div className="md:col-span-2">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h2 className="text-lg font-semibold mb-3">Attached Files (RFQ)</h2>
            {attachments.length ? attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-2 border rounded mb-2">
                <span className="text-xl">{getFileIcon(a)}</span>
                <a href={a} target="_blank" rel="noreferrer" className="text-blue-600 underline">{a.split('/').pop()}</a>
              </div>
            )) : <p className="text-gray-500">No files attached</p>}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Requested Items</h2>
        {(rfqDetails.items || []).map((item: any, i: number) => (
          <div key={i} className="border rounded-lg shadow-sm p-6 bg-gray-50 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-md font-semibold">{item.internalPartNo ?? item.itemNumber ?? ''}</p>
                <p className="text-sm text-gray-600">{item.description ?? ''}</p>
              </div>
              <div>
                <span className="inline-block bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1 rounded">
                  Qty: {String(item.quantity ?? item.qty ?? item.estQuantity ?? '')} {item.uom ?? ''}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Delivery Days</label>
                <input type="number" className="mt-1 w-full border rounded px-3 py-2" value={quoteData[i]?.deliveryDays ?? ''} onChange={(e) => handleQuoteInputChange(i, 'deliveryDays', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                <input type="number" step="0.01" className="mt-1 w-full border rounded px-3 py-2" value={quoteData[i]?.unitPrice ?? ''} onChange={(e) => handleQuoteInputChange(i, 'unitPrice', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Qty (offered)</label>
                <input type="number" className="mt-1 w-full border rounded px-3 py-2" value={quoteData[i]?.qty ?? ''} onChange={(e) => handleQuoteInputChange(i, 'qty', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">UOM</label>
                <select className="mt-1 w-full border rounded px-3 py-2" value={quoteData[i]?.uom ?? (item.uom ?? '')} onChange={(e) => handleQuoteInputChange(i, 'uom', e.target.value)}>
                  <option value="">{item.uom ?? 'Select UOM'}</option>
                  {uoms.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Cost</label>
                <input type="text" disabled className="mt-1 w-full bg-gray-100 border rounded px-3 py-2 text-right" value={typeof quoteData[i]?.cost === 'number' ? quoteData[i].cost.toFixed(2) : ''} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-gray-700">Shipping</label>
          <select className="mt-1 w-full border rounded px-3 py-2" name="shipping">
            <option value="Included">Included</option>
            <option value="Not Included">Not Included</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Additional Info for Buyer</label>
          <textarea name="comments" className="border rounded px-3 py-2 w-full" />
        </div>

        <div className="border rounded p-4 bg-gray-50">
          <label className="block font-medium mb-2">Attach files to this Quote (optional)</label>
          <input type="file" multiple onChange={(ev) => onNewFilesChange(ev.target.files)} className="mb-3" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
          {newFiles.length > 0 && newFiles.map((f, idx) => (
            <div key={`${f.name}-${idx}`} className="flex items-center justify-between p-2 border rounded mb-2 bg-white">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getFileIcon(f.name)}</span>
                <div>
                  <div className="font-medium text-sm">{f.name}</div>
                  <div className="text-xs text-gray-500">{Math.round(f.size / 1024)} KB</div>
                </div>
              </div>
              <button type="button" onClick={() => removeNewFileAt(idx)} className="text-sm text-red-600 hover:underline">Remove</button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Submit Quote</button>
          {/* <button type="button" onClick={() => rfqDetails?.rfqId && window.open(`/buyer/rfq/${rfqDetails.rfqId}`, '_blank')} className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200">Open RFQ</button> */}
        </div>
      </form>
    </div>
  );
}
