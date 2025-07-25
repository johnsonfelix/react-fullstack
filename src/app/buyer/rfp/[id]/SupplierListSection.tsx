'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/app/components/ui/button';

type Supplier = {
  id: string;
  name: string;
  city: string;
  state: string;
  zipcode: string;
  user?: { email?: string };
};

interface Procurement {
  id: string;
  category: string;
}

export default function SupplierSelectionSection({ procurement }:{ procurement: Procurement }) {
  const [dbSuppliers, setDbSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [manualSuppliers, setManualSuppliers] = useState<Supplier[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSupplierForm, setManualSupplierForm] = useState({
    name: '',
    email: '',
    firstName: '',
    lastName: '',
  });

  // 1️⃣ Fetch category suppliers
  useEffect(() => {
    if (!procurement?.category) return;

    const fetchSuppliers = async () => {
      try {
        const res = await axios.get(`/api/suppliers/by-category/${encodeURIComponent(procurement.category)}`);
        setDbSuppliers(res.data);
      } catch (err) {
        console.error('Error fetching category suppliers:', err);
      }
    };

    fetchSuppliers();
  }, [procurement?.category]);

  // 2️⃣ Fetch suppliers already linked to procurement on load
 useEffect(() => {
  const fetchProcurementSuppliers = async () => {
    try {
      const res = await axios.get(`/api/procurement/${procurement.id}/suppliers`);
      const suppliers: Supplier[] = res.data;

      setSelectedSuppliers(suppliers.map(s => s.id));

      // Separate out suppliers that are not in category suppliers and add them to manualSuppliers for visibility
      const manualOnly = suppliers.filter(
        s => !dbSuppliers.some(dbS => dbS.id === s.id)
      );
      setManualSuppliers(manualOnly);
    } catch (err) {
      console.error('Error fetching procurement suppliers:', err);
    }
  };

  if (procurement?.id) {
    fetchProcurementSuppliers();
  }
}, [procurement?.id, dbSuppliers]); // depend on dbSuppliers to sync manual suppliers correctly


  // 3️⃣ Toggle selection
  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  // 4️⃣ Add manual supplier
  const handleManualSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/suppliers/manual-create', manualSupplierForm);
      const newSupplier = res.data;

      const supplier: Supplier = {
        id: newSupplier.supplier.id,
        name: newSupplier.supplier.name,
        city: newSupplier.city || '',
        state: newSupplier.state || '',
        zipcode: newSupplier.zipcode || '',
        user: newSupplier.user || { email: newSupplier.email },
      };

      setManualSuppliers(prev => [...prev, supplier]);
      setSelectedSuppliers(prev => [...prev, supplier.id]);

      setManualSupplierForm({ name: '', email: '', firstName: '', lastName: '' });
      setShowManualModal(false);
    } catch (err) {
      console.error('Error adding manual supplier:', err);
      alert('Failed to add manual supplier');
    }
  };

  // 5️⃣ Save suppliers to procurement
  const handleSaveSuppliers = async () => {
    try {
      await axios.post('/api/procurement/add-supplier', {
        procurementRequestId: procurement.id,
        supplierIds: selectedSuppliers,
      });
      alert('Suppliers saved to procurement successfully!');
    } catch (err) {
      console.error('Error saving suppliers:', err);
      alert('Failed to save suppliers.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Suppliers</h2>

      {/* Category suppliers */}
      <div className="border rounded shadow-sm overflow-hidden">
        <h3 className="bg-gray-50 px-4 py-2 font-medium">Suggested Suppliers</h3>
        {dbSuppliers.length === 0 ? (
          <p className="px-4 py-2 text-sm text-gray-500">No suppliers found for this category.</p>
        ) : (
          dbSuppliers.map(supplier => {
            const isSelected = selectedSuppliers.includes(supplier.id);
            // const email = supplier.user?.email || 'No email';
            const address = `${supplier.city}, ${supplier.state} ${supplier.zipcode}`;

            return (
              <div
                key={supplier.id}
                onClick={() => toggleSupplier(supplier.id)}
                className={`px-4 py-2 border-t cursor-pointer flex items-start gap-2 ${
                  isSelected ? 'bg-blue-50' : ''
                } hover:bg-blue-100`}
              >
                <input type="checkbox" readOnly checked={isSelected} />
                <div>
                  <div className="font-medium">{supplier.name}</div>
                  {/* <div className="text-xs text-gray-600">{email}</div> */}
                  <div className="text-xs text-gray-500">{address}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual suppliers */}
      {manualSuppliers.length > 0 && (
        <div className="border rounded shadow-sm overflow-hidden">
          <h3 className="bg-gray-50 px-4 py-2 font-medium">Manual Suppliers</h3>
          {manualSuppliers.map(supplier => {
            const isSelected = selectedSuppliers.includes(supplier.id);
            const email = supplier.user?.email || 'No email';
            const address = `${supplier.city}, ${supplier.state} ${supplier.zipcode}`;

            return (
              <div
                key={supplier.id}
                onClick={() => toggleSupplier(supplier.id)}
                className={`px-4 py-2 border-t cursor-pointer flex items-start gap-2 ${
                  isSelected ? 'bg-blue-50' : ''
                } hover:bg-blue-100`}
              >
                <input type="checkbox" readOnly checked={isSelected} />
                <div>
                  <div className="font-medium">{supplier.name}</div>
                  <div className="text-xs text-gray-600">{email}</div>
                  <div className="text-xs text-gray-500">{address}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Manual Supplier */}
      <button
        onClick={() => setShowManualModal(true)}
        className="text-blue-600 hover:underline text-sm"
      >
        + Add Manual Supplier
      </button>

      {/* Save Button */}
      <div className="flex justify-end">
      <Button
        onClick={handleSaveSuppliers}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Save Suppliers to Procurement
      </Button>
      </div>

      {/* Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-sm">
            <h3 className="text-lg font-medium mb-4">Add Manual Supplier</h3>
            <form onSubmit={handleManualSupplierSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Company Name"
                value={manualSupplierForm.name}
                onChange={e => setManualSupplierForm({ ...manualSupplierForm, name: e.target.value })}
                required
                className="w-full border px-3 py-2 rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={manualSupplierForm.email}
                onChange={e => setManualSupplierForm({ ...manualSupplierForm, email: e.target.value })}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                type="text"
                placeholder="First Name"
                value={manualSupplierForm.firstName}
                onChange={e => setManualSupplierForm({ ...manualSupplierForm, firstName: e.target.value })}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={manualSupplierForm.lastName}
                onChange={e => setManualSupplierForm({ ...manualSupplierForm, lastName: e.target.value })}
                className="w-full border px-3 py-2 rounded"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowManualModal(false)} className="text-gray-600 hover:underline">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
