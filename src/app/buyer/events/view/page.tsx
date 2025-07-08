'use client';

import { useEffect, useState } from 'react';

const RfqForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    closeDate: '',
    closeTime: '',
    preferredDeliveryTime: '',
    requesterReference: '',
    shippingAddress: '',
    paymentProcess: '',
    currency: '',
    shippingType: '',
    carrier: '',
    urgency: '',
    customerCategories: '',
    notesToSupplier: '',
  });

  const [options, setOptions] = useState({
    currencies: [],
    paymentProcesses: [],
    shippingTypes: [],
    urgencies: [],
    customerCategories: [],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/options/brfq')
      .then((res) => res.json())
      .then((data) => {
        setOptions({
          currencies: data.currencies || [],
          paymentProcesses: data.paymentProcesses || [],
          shippingTypes: data.shippingTypes || [],
          urgencies: data.urgencies || [],
          customerCategories: data.customerCategories || [],
        });
      })
      .catch((err) => console.error('Error loading dropdown options:', err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/brfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('RFQ Submitted!');
        setFormData({
          title: '',
          closeDate: '',
          closeTime: '',
          preferredDeliveryTime: '',
          requesterReference: '',
          shippingAddress: '',
          paymentProcess: '',
          currency: '',
          shippingType: '',
          carrier: '',
          urgency: '',
          customerCategories: '',
          notesToSupplier: '',
        });
      } else {
        alert('Submission failed.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Create RFQ</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow-md rounded-md">
        {/* Section 1: Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="title" value={formData.title} onChange={handleChange} placeholder="Title*" className="input" required />
          <input name="closeDate" type="date" value={formData.closeDate} onChange={handleChange} className="input" required />
          <input name="closeTime" type="time" value={formData.closeTime} onChange={handleChange} className="input" required />
          <input name="preferredDeliveryTime" type="text" value={formData.preferredDeliveryTime} onChange={handleChange} placeholder="Preferred Delivery Time" className="input" />
          <input name="requesterReference" value={formData.requesterReference} onChange={handleChange} placeholder="Requester / Reference" className="input" />
          <input name="shippingAddress" value={formData.shippingAddress} onChange={handleChange} placeholder="Shipping Address" className="input" />
          <input name="carrier" value={formData.carrier} onChange={handleChange} placeholder="Carrier" className="input" />

          <select name="currency" value={formData.currency} onChange={handleChange} className="input" required>
            <option value="">Select Currency*</option>
            {options.currencies.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>

          <select name="paymentProcess" value={formData.paymentProcess} onChange={handleChange} className="input" required>
            <option value="">Select Payment Process*</option>
            {options.paymentProcesses.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>

          <select name="shippingType" value={formData.shippingType} onChange={handleChange} className="input">
            <option value="">Select Shipping Type</option>
            {options.shippingTypes.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>

          <select name="urgency" value={formData.urgency} onChange={handleChange} className="input">
            <option value="">Select Urgency</option>
            {options.urgencies.map((u: any) => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>

          <select name="customerCategories" value={formData.customerCategories} onChange={handleChange} className="input">
            <option value="">Select Customer Category</option>
            {options.customerCategories.map((cat: any) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
          </select>
        </div>

        {/* Notes Section */}
        <div>
          <label className="block font-semibold mb-1">Notes to Supplier</label>
          <textarea
            name="notesToSupplier"
            value={formData.notesToSupplier}
            onChange={handleChange}
            rows={4}
            className="w-full border rounded-md p-2"
            placeholder="Enter any special notes..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Save & Send'}
          </button>
          <button
            type="button"
            onClick={() => alert('Draft saved (placeholder)')}
            className="border border-gray-500 text-gray-700 px-6 py-2 rounded hover:bg-gray-100"
          >
            Save Draft
          </button>
        </div>
      </form>
    </div>
  );
};

export default RfqForm;

// TailwindCSS utility class for inputs
// Add this to your global.css or directly in your component
// .input {
//   @apply w-full border border-gray-300 rounded-md p-2;
// }
