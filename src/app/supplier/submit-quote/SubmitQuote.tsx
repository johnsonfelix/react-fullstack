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
  const [attachments, setAttachments] = useState<string[]>([]);

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
        const res = await fetch(`/api/lib/verify-quote-token?token=${token}`);
        const data = await res.json();

        const supplierRes = await fetch(`/api/suppliers/${data.supplierId}`);
        const supplier = await supplierRes.json();
        setSupplierName(supplier.name);

        if (data?.rfqId) {
          setTokenPayload({ rfqId: data.rfqId, supplierId: data.supplierId });

          const rfqRes = await fetch(`/api/brfq/${data.rfqId}`);
          const rfq = await rfqRes.json();
          setRfqDetails(rfq);

          if (rfq.attachmentPath) {
            setAttachments(rfq.attachmentPath.split('|'));
          }
          setSelectedCurrency(rfq.currency || '');

          if (rfq.shippingAddress) {
            const addressRes = await fetch(`/api/address/${rfq.shippingAddress}`);
            const address = await addressRes.json();
            if (address?.line1) {
              const formatted = [
                address.line1,
                address.city,
                address.state,
                address.zip ?? address.zipCode,
                address.country,
              ].filter(Boolean).join(', ');
              setFullAddress(formatted);
            }
          }

          setQuoteData(
            rfq.items.map((item: any) => ({
              supplierPartNo: '',
              deliveryDays: '',
              unitPrice: '',
              qty: item.quantity.toString() || '',
              uom: item.uom || '',
              cost: 0,
            }))
          );
        }

        const currencyRes = await fetch(`/api/administration/fields/currency`);
        const currencyList = await currencyRes.json();
        setCurrencies(currencyList.map((c: any) => c.name));

        const uomRes = await fetch(`/api/administration/fields/uom`);
        const uomList = await uomRes.json();
        setUoms(uomList.map((u: any) => u.name));
      } catch (err) {
        console.error('Verification failed:', err);
      }
    };

    verifyAndFetchRFQ();
  }, [token]);

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png': return '🖼️';
      default: return '📎';
    }
  };

  const FileAttachments = () => (
    <div className="border rounded-lg p-4 bg-gray-50 mt-6">
      <h2 className="text-lg font-semibold mb-3">Attached Files</h2>
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded hover:bg-gray-100">
              <div className="flex items-center">
                <span className="text-xl mr-2">{getFileIcon(file)}</span>
                <a
                  href={file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {file.split('/').pop()}
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No files attached to this RFQ</p>
      )}
    </div>
  );

  if (!tokenPayload || !rfqDetails) return <div className="p-4">Verifying token or loading RFQ...</div>;

  const handleQuoteInputChange = (index: number, field: string, value: string) => {
    const updated = [...quoteData];
    updated[index][field] = value;
    if (field === 'unitPrice' || field === 'qty') {
      const price = parseFloat(updated[index].unitPrice || '0');
      const qty = parseFloat(updated[index].qty || '0');
      updated[index].cost = price * qty;
    }
    setQuoteData(updated);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const payload = {
      token,
      supplierQuoteNo: supplierQuoteNo,
      validFor: validFor,
      currency: selectedCurrency,
      items: quoteData,
      comments: formData.get('comments'),
      shipping: formData.get('shipping'),
    };

    const res = await fetch('/api/suppliers/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert('Quote submitted successfully!');
    } else {
      alert('Please Fill all the Required Feilds');
    }
  };

  return (
    <div className="relative  max-w-7xl mx-auto p-6 bg-white shadow rounded-lg mt-8 space-y-6">
      <div className="absolute top-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded shadow text-sm font-semibold">
        Closes in: {timeLeft}
      </div>
      <h1 className="text-2xl font-bold mb-4">Submit Quote for: {rfqDetails.title} by {supplierName}</h1>
      {/* RFQ General Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border p-4 rounded bg-gray-50 space-y-4">
          <div>
            <label className="block font-medium">Supplier Quote No</label>
            <input
              name="supplierQuoteNo"
              required
              className="border rounded px-3 py-2 w-full"
              value={supplierQuoteNo}
              onChange={(e) => setSupplierQuoteNo(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium">Valid For</label>
            <select
              name="validFor"
              required
              className="border rounded px-3 py-2 w-full"
              value={validFor}
              onChange={(e) => setValidFor(e.target.value)}
            >
              <option>Select Vaild Days</option>
              {[1, 2, 3, 4, 5, 6, 7, 10, 15, 30].map((day) => (
                <option key={day} value={`${day} days`}>{`${day} day${day > 1 ? 's' : ''}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium">Currency</label>
            <select
              name="currency"
              required
              className="border rounded px-3 py-2 w-full"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
            >
              <option value="">Select Currency</option>
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border p-4 rounded bg-gray-50 space-y-2">
          <h2 className="text-lg font-semibold mb-2">RFQ Info</h2>
          <p><strong>Close Date:</strong> {new Date(rfqDetails.closeDate).toLocaleDateString()}</p>
          <p><strong>Urgency:</strong> {rfqDetails.urgency}</p>
          <p><strong>Shipping Address:</strong> {fullAddress || 'Loading address...'}</p>
          <p><strong>Payment Process:</strong> {rfqDetails.paymentProcess}</p>
          <p><strong>Notes:</strong> {rfqDetails.notesToSupplier || 'N/A'}</p>
        </div>
        <FileAttachments />
      </div>
      {/* Requested Items with Quote Inputs */}
      <div className="space-y-6 ">
        <h2 className="text-xl font-semibold">Requested Items</h2>
        {rfqDetails.items.map((item: any, i: number) => (
          <div key={i} className="border rounded-lg shadow-sm p-6 bg-gray-50 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <p className="text-md font-semibold">Item: {item.internalPartNo}</p>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <div className="mt-2 md:mt-0">
                <span className="inline-block bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1 rounded">
                  Qty: {item.quantity} {item.uom}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
                <input disabled value={item.manufacturer} className="mt-1 w-full rounded border px-3 py-2 bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mfg Part No</label>
                <input disabled value={item.mfgPartNo} className="mt-1 w-full rounded border px-3 py-2 bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplier Part No</label>
                <input
                  type="text"
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={quoteData[i]?.supplierPartNo || ''}
                  onChange={(e) => handleQuoteInputChange(i, 'supplierPartNo', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Delivery Days</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={quoteData[i]?.deliveryDays || ''}
                  onChange={(e) => handleQuoteInputChange(i, 'deliveryDays', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={quoteData[i]?.unitPrice || ''}
                  onChange={(e) => handleQuoteInputChange(i, 'unitPrice', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Qty (offered)</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={quoteData[i]?.qty || ''}
                  onChange={(e) => handleQuoteInputChange(i, 'qty', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">UOM</label>
                <select
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={quoteData[i]?.uom || ''}
                  onChange={(e) => handleQuoteInputChange(i, 'uom', e.target.value)}
                >
                  <option value="">Select UOM</option>
                  {uoms.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost</label>
                <input
                  type="text"
                  disabled
                  className="mt-1 w-full bg-gray-100 border rounded px-3 py-2 text-right"
                  value={quoteData[i]?.cost?.toFixed(2)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Submit Section */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-gray-700">Shipping</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2" name="shipping" id="">
            <option value="Included">Included</option>
            <option value="Not Included">Not Included</option>
          </select>
        </div>
        <div>
          <label className="block font-medium">Additional Info for Buyer</label>
          <textarea name="comments" className="border rounded px-3 py-2 w-full" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Submit Quote
        </button>
      </form>
    </div>
  );
}
