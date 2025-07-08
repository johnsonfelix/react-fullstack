'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import DragAndDrop from '@/app/components/ui/dragAndDrop';

type Supplier = { id: string; name: string; city: string; state: string; zipcode: string; user?: { email?: string } };
type CategoryWithSuppliers = { id: string; name: string; suppliers: Supplier[] };

const RFQForm = () => {
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
  const [formFiles, setFormFiles] = useState<File[]>([]);

  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const [options, setOptions] = useState<any>({
    currencies: [],
    customerCategory: [],
    shippingTypes: [],
    urgencies: [],
    uoms: [],
    suppliers: [],
    address: [],
    payment: [],
  });

  const [formData, setFormData] = useState({
    title: '',
    rfqId: '',
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
    noteToSupplier: '',
    productSpecification: '',
    categoryIds: [] as string[],
    items: [{
      internalPartNo: '',
      manufacturer: '',
      mfgPartNo: '',
      description: '',
      uom: '',
      quantity: 0,
    }],
    suppliersSelected: [] as { id: string; email: string }[],
  });

  const [selectedCategories, setSelectedCategories] = useState<CategoryWithSuppliers[]>([]);
  const [selectedSuppliersMap, setSelectedSuppliersMap] = useState<Record<string, string[]>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [manualSupplier, setManualSupplier] = useState({ name: '', email: '', firstName: '', lastName: '' });

  const manualCategory = selectedCategories.find(cat => cat.id === "manual");
  const categoryBased = selectedCategories.filter(cat => cat.id !== "manual");

  useEffect(() => {
    const fetchRfqId = async () => {
      try {
        const res = await fetch('/api/brfq/generate-id');
        const data = await res.json();
        if (res.ok && data.rfqId) {
          setFormData((prev) => ({ ...prev, rfqId: data.rfqId }));
        }
      } catch (err) {
        console.error('Failed to generate RFQ ID', err);
      }
    };
    fetchRfqId();
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await axios.get("/api/options/brfq");
        setOptions(res.data);
      } catch (error) {
        console.error("Error fetching options:", error);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    const selectedSuppliers = selectedCategories.flatMap((cat) =>
      (selectedSuppliersMap[cat.id] || []).map((sid) => {
        const supplier = cat.suppliers.find((s) => s.id === sid);
        return supplier ? { id: supplier.id, email: supplier.user?.email || "" } : null;
      })
    ).filter(Boolean) as { id: string; email: string }[];
    setFormData((prev) => ({ ...prev, suppliersSelected: selectedSuppliers }));
  }, [selectedSuppliersMap, selectedCategories]);

  useEffect(() => {
    const categoryIds = selectedCategories.map((cat) => cat.id);
    setFormData((prev) => ({ ...prev, categoryIds }));
  }, [selectedCategories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, index?: number) => {
    const { name, value } = e.target;
    if (index !== undefined) {
      const updatedItems = [...formData.items];
      updatedItems[index] = { ...updatedItems[index], [name]: value };
      setFormData({ ...formData, items: updatedItems });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        internalPartNo: '',
        manufacturer: '',
        mfgPartNo: '',
        description: '',
        uom: '',
        quantity: 0,
      }],
    });
  };

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      alert("Please agree to the terms and conditions");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // First create FormData for files
      const formDataWithFiles = new FormData();
      
      // Append all files
      formFiles.forEach(file => {
        formDataWithFiles.append('files', file);
      });

      // Append all form data as JSON
      formDataWithFiles.append('rfqData', JSON.stringify(formData));

      // Upload with progress tracking
      const res = await axios.post("/api/brfq", formDataWithFiles, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        },
      });

      if (res.status === 200 || res.status === 201) {
        alert("RFQ created successfully!");
        // Optionally reset form here
      } else {
        throw new Error(res.data.message || "Failed to create RFQ");
      }
    } catch (error) {
      console.error("Error submitting RFQ:", error);
      alert(error instanceof Error ? error.message : "Failed to create RFQ");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleExcelUpload = (file: File) => {
  const reader = new FileReader();
  reader.onload = (evt) => {
    const data = evt.target?.result;
    if (!data) return;
    const workbook = XLSX.read(data, { type: "binary" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    const newItems = jsonData.map((row) => ({
      internalPartNo: row["Internal Part No"] || "",
      manufacturer: row.Manufacturer || "",
      mfgPartNo: row["Mfg Part No"] || "",
      description: row.Description || "",
      uom: row.UOM || "",
      quantity: Number(row.Quantity || 0),
    }));
    setFormData((prev) => ({ ...prev, items: [...prev.items, ...newItems] }));
  };
  reader.readAsBinaryString(file);
};

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ "Internal Part No": "", Manufacturer: "", "Mfg Part No": "", Description: "", UOM: "", Quantity: 0 }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "RFQ_Items_Template.xlsx");
  };

  const handleManualSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/suppliers/manual-create", manualSupplier);
      const newSupplier = res.data;
      console.log(newSupplier);
      
     const supplierObj: Supplier = {
  id: newSupplier.supplier.id,
  name: newSupplier.supplier.name, 
  city: newSupplier.city || '',     
  state: newSupplier.state || '',
  zipcode: newSupplier.zipcode || '',
  user: newSupplier.user || { email: newSupplier.email },
};
      const manualCategoryIndex = selectedCategories.findIndex(cat => cat.id === "manual");

if (manualCategoryIndex >= 0) {
  // Manual category already exists, append to it
  setSelectedCategories(prev => {
    const updated = [...prev];
    updated[manualCategoryIndex] = {
      ...updated[manualCategoryIndex],
      suppliers: [...updated[manualCategoryIndex].suppliers, supplierObj],
    };
    return updated;
  });

  setSelectedSuppliersMap(prev => ({
    ...prev,
    manual: [...(prev.manual || []), supplierObj.id],
  }));
} else {
  // Create new manual category
  setSelectedCategories(prev => [
    ...prev,
    {
      id: "manual",
      name: "Manual",
      suppliers: [supplierObj],
    }
  ]);

  setSelectedSuppliersMap(prev => ({
    ...prev,
    manual: [supplierObj.id],
  }));
}
      setManualSupplier({ name: '', email: '', firstName: '', lastName: '' });
      setShowSupplierModal(false);
    } catch (err) {
      console.error("Failed to add supplier:", err);
      alert("Failed to add supplier.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-5xl mx-auto px-4 py-10 space-y-10 bg-gray-50"
    >
      <h2 className="text-3xl font-bold text-gray-800 text-center">Create RFQ</h2>

      {/* RFQ Title */}
      <div className="p-4 bg-white shadow rounded-md">
        <label className="block font-semibold text-gray-700 mb-1">RFQ Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* RFQ Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "RFQ ID", name: "rfqId", type: "text" },
          { label: "Close Date", name: "closeDate", type: "date" },
          { label: "Close Time", name: "closeTime", type: "time" },
          { label: "Preferred Delivery Date", name: "preferredDeliveryTime", type: "date" },
          { label: "Requester Reference", name: "requesterReference", type: "text" },
          { label: "Carrier", name: "carrier", type: "text" },
        ].map((field) => (
          <div key={field.name} className="p-4 bg-white shadow rounded-md">
            <label className="block font-semibold text-gray-700 mb-1">{field.label}</label>
            <input
              type={field.type}
              name={field.name}
              value={(formData as any)[field.name]}
              onChange={handleChange}
              readOnly={field.name === "rfqId"}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={["rfqId", "closeDate", "closeTime"].includes(field.name)}
            />
          </div>
        ))}

        {/* Dropdown Fields */}
        {[
          { name: "shippingAddress", label: "Shipping Address", options: options.address },
          { name: "paymentProcess", label: "Payment Process", options: options.payment },
          { name: "currency", label: "Currency", options: options.currencies },
          { name: "shippingType", label: "Shipping Type", options: options.shippingTypes },
          { name: "urgency", label: "Urgency", options: options.urgencies },
        ].map((field) => (
          <div key={field.name} className="p-4 bg-white shadow rounded-md">
            <label className="block font-semibold text-gray-700 mb-1">{field.label}</label>
            <select
              name={field.name}
              value={(formData as any)[field.name]}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select {field.label}</option>
              {field.options.map((opt: any) => (
                <option
                  key={opt.id}
                  value={field.name === "shippingAddress" ? opt.id : opt.name}
                >
                  {field.name === "shippingAddress"
                    ? `${opt.street}, ${opt.city}, ${opt.state}, ${opt.country} - ${opt.zipCode}`
                    : opt.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Request Items */}
      <div className="space-y-4">
  <h2 className="text-xl font-semibold">Request Items</h2>

  {/* Excel Upload */}
 <div className="space-y-4 bg-white p-4 rounded-lg shadow-md border">
  <h3 className="text-lg font-semibold text-gray-800">Import Items via Excel</h3>

  <DragAndDrop 
    onFilesDropped={(files) => {
      if (files.length > 0) {
        handleExcelUpload(files[0]);
      }
    }}
    accept=".xlsx,.xls"
    className="p-4 border-2 border-dashed border-gray-300 rounded-md"
  >
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-600">Drag and drop</span> your Excel file here, or
      </p>
      <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={(e) => e.target.files?.[0] && handleExcelUpload(e.target.files[0])}
          className="hidden"
        />
        <span>Browse Files</span>
      </label>
      <p className="text-xs text-gray-500">
        Supported formats: .xlsx, .xls. Max file size: 5MB
      </p>
    </div>
  </DragAndDrop>

  <button
    type="button"
    onClick={downloadTemplate}
    className="text-sm text-blue-600 underline hover:text-blue-800 transition"
  >
    📄 Download Excel Template
  </button>
</div>


    {/* Manual Item Entry */}
    {formData.items.map((item, index) => (
      <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-white p-4 border rounded-md shadow-sm">
        <input
          type="text"
          name="internalPartNo"
          value={item.internalPartNo}
          onChange={(e) => handleChange(e, index)}
          placeholder="Internal Part No"
          className="border px-2 py-1 rounded w-full"
        />
        <input
          type="text"
          name="manufacturer"
          value={item.manufacturer}
          onChange={(e) => handleChange(e, index)}
          placeholder="Manufacturer"
          className="border px-2 py-1 rounded w-full"
        />
        <input
          type="text"
          name="mfgPartNo"
          value={item.mfgPartNo}
          onChange={(e) => handleChange(e, index)}
          placeholder="Mfg Part No"
          className="border px-2 py-1 rounded w-full"
        />
        <input
          type="text"
          name="description"
          value={item.description}
          onChange={(e) => handleChange(e, index)}
          placeholder="Description"
          className="border px-2 py-1 rounded w-full"
        />
        <select
          name="uom"
          value={item.uom}
          onChange={(e) => handleChange(e, index)}
          className="border px-2 py-1 rounded w-full"
        >
          <option value="">Select UOM</option>
          {options.uoms.map((u: any) => (
            <option key={u.id} value={u.name}>
              {u.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            name="quantity"
            value={item.quantity}
            onChange={(e) => handleChange(e, index)}
            placeholder="Qty"
            className="border px-2 py-1 rounded w-full"
          />
          <button
            type="button"
            onClick={() => {
              const newItems = formData.items.filter((_, i) => i !== index);
              setFormData((prev) => ({ ...prev, items: newItems }));
            }}
            className="text-red-600 text-sm hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    ))}

    <div className="text-right">
      <button
        type="button"
        onClick={addItem}
        className="text-blue-600 text-sm font-medium hover:underline"
      >
        + Add Item
      </button>
    </div>
  </div>

  {/* manually add suppliers */}

  {/* Manual Suppliers */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-2">Manua Suppliers</h3>
        {!manualCategory?.suppliers.length ? (
          <p className="text-sm text-gray-500">No manual suppliers added.</p>
        ) : (
          <div className="border rounded p-2 bg-white shadow-sm">
            
            {manualCategory?.suppliers.map(s => {
              console.log(manualCategory);
              
              const isSelected = selectedSuppliersMap.manual?.includes(s.id) ?? false;
              const address = `${s.name}, ${s.state} ${s.zipcode}`;
              const email = s.user?.email || "No email";

              return (
                <div
                  key={s.id}
                  className={`p-2 border-b cursor-pointer hover:bg-blue-50 transition ${
                    isSelected ? "bg-blue-100" : ""
                  }`}
                  onClick={() => {
                    setSelectedSuppliersMap(prev => {
                      const current = prev.manual || [];
                      const updated = current.includes(s.id)
                        ? current.filter(id => id !== s.id)
                        : [...current, s.id];
                      return { ...prev, manual: updated };
                    });
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="mr-2"
                  />                  
                  <span className="font-medium">{s.name}</span> {email}
                </div>
              );
            })}
          </div>
        )}
      </div>

  {/* Supplier Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Supplier Invitation</h2>
            <button type="button" onClick={() => setShowSupplierModal(true)} className="text-sm text-blue-600 hover:underline">+ Add Supplier</button>
          </div>

        </div>

      {/* Category + Suppliers Section */}
      <div className="p-4 bg-white shadow rounded-md space-y-4">
  <label className="block font-semibold text-gray-700 mb-1">Search Category</label>
  <input
    type="text"
    value={categorySearch}
    onChange={(e) => {
      const val = e.target.value;
      setCategorySearch(val);
      if (val.length > 1) {
        axios
          .get(`/api/categories/search?q=${val}`)
          .then((res) => setCategoryOptions(res.data))
          .catch((err) => console.error(err));
      } else {
        setCategoryOptions([]);
      }
    }}
    placeholder="Start typing to search..."
    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
  />

   {/* Supplier Modal */}
      {showSupplierModal && (
        <div
  className="fixed inset-0 z-50 flex justify-center items-center"
  style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
>

          <div className="bg-white p-6 rounded-md shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add Supplier</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Company Name"
                className="w-full border px-3 py-2 rounded"
                value={manualSupplier.name}
                onChange={(e) => setManualSupplier({ ...manualSupplier, name: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full border px-3 py-2 rounded"
                value={manualSupplier.email}
                onChange={(e) => setManualSupplier({ ...manualSupplier, email: e.target.value })}
              />
              <input
                type="text"
                placeholder="First Name"
                className="w-full border px-3 py-2 rounded"
                value={manualSupplier.firstName}
                onChange={(e) => setManualSupplier({ ...manualSupplier, firstName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Last Name"
                className="w-full border px-3 py-2 rounded"
                value={manualSupplier.lastName}
                onChange={(e) => setManualSupplier({ ...manualSupplier, lastName: e.target.value })}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowSupplierModal(false)} className="text-gray-600 hover:underline">Cancel</button>
                <button onClick={handleManualSupplierSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

  {categoryOptions.length > 0 && (
    <ul className="border rounded shadow-sm max-h-40 overflow-y-auto bg-white">
      {categoryOptions.map((cat: any) => (
        <li
          key={cat.id}
          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
          onClick={() => {
            if (selectedCategories.find((c) => c.id === cat.id)) return;
            setCategorySearch(cat.name);
            setCategoryOptions([]);

            axios
              .get(`/api/categories/${cat.id}/suppliers`)
              .then((res) => {
                setSelectedCategories((prev) => [
                  ...prev,
                  { ...cat, suppliers: res.data },
                ]);
              })
              .catch((err) => console.error(err));
          }}
        >
          {cat.name}
        </li>
      ))}
    </ul>
  )}

  {/* Show suppliers for all selected categories */}
  {selectedCategories
  .filter((cat) => cat.id !== "manual") // Exclude manual suppliers here
  .map((cat) => (
    <div key={cat.id} className="mt-4">
      <label className="block font-semibold text-gray-700 mb-2">
        Suppliers from: <span className="text-blue-600">{cat.name}</span>
      </label>
{/* remove button */}
      <button
    className="text-red-500 hover:underline text-sm"
    onClick={() => {
      setSelectedCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setSelectedSuppliersMap((prev) => {
        const { [cat.id]: _, ...rest } = prev;
        return rest;
      });
    }}
  >
    Remove
  </button>

      <div className="border border-gray-300 rounded-md shadow-sm overflow-hidden max-h-60 overflow-y-auto">
        {cat.suppliers.length === 0 ? (
          <div className="px-4 py-3 text-gray-500 text-sm text-center">
            No suppliers found
          </div>
        ) : (
          cat.suppliers.map((s) => {
            const isSelected = selectedSuppliersMap[cat.id]?.includes(s.id) ?? false;
            const address = `${s.city}, ${s.state} ${s.zipcode}`;
            const email = s.user?.email || "No email";

            return (
              <div
                key={s.id}
                className={`px-4 py-3 border-b last:border-none cursor-pointer hover:bg-blue-50 transition ${
                  isSelected ? "bg-blue-100" : ""
                }`}
                onClick={() => {
                  setSelectedSuppliersMap((prev) => {
                    const current = prev[cat.id] || [];
                    const updated = current.includes(s.id)
                      ? current.filter((id) => id !== s.id)
                      : [...current, s.id];
                    return { ...prev, [cat.id]: updated };
                  });                 
                }}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={isSelected}
                    readOnly
                  />
                  <div>
                    <div className="font-semibold text-gray-800">{s.name}</div>
                    <div className="text-sm text-gray-600">{email}</div>
                    <div className="text-sm text-gray-500">{address}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  ))}

  

  {/* Summary Box */}
  {/* {selectedCategories.length > 0 && (
    <div className="mt-6 p-4 border border-blue-300 bg-blue-50 rounded shadow-sm">
      <h4 className="font-semibold text-blue-800 mb-2">Summary</h4>
      {selectedCategories.map((cat) => (
        <div key={cat.id} className="mb-2">
          <p className="text-gray-700">
            <span className="font-medium">Category:</span> {cat.name}
          </p>
          <p className="text-gray-700 text-sm">
            <span className="font-medium">Suppliers:</span>{" "}
            {(selectedSuppliersMap[cat.id] || [])
              .map((sid) => cat.suppliers.find((s) => s.id === sid)?.name)
              .filter(Boolean)
              .join(", ") || "None selected"}
          </p>
        </div>
      ))}
    </div>
  )} */}
</div>

{/* Note to Supplier */}

<div className="mt-6">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Note to Supplier
  </label>
  <textarea
    rows={4}
    placeholder="Enter any notes or instructions for the supplier..."
    className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    value={formData.noteToSupplier || ""}
    onChange={(e) =>
      setFormData((prev) => ({
        ...prev,
        noteToSupplier: e.target.value,
      }))
    }
  />
</div>

{/* product specs */}

<div className="mt-6">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Product Specifications
  </label>
  <textarea
    rows={4}
    placeholder="Enter any notes about product..."
    className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    value={formData.productSpecification || ""}
    onChange={(e) =>
      setFormData((prev) => ({
        ...prev,
        productSpecification: e.target.value,
      }))
    }
  />
</div>


{/* File Upload Section - Update this part */}
  <div className="mt-6">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Attach Files (PDF, DOC, XLS, Images)
  </label>
  
  <DragAndDrop 
    onFilesDropped={(files) => {
      setFormFiles(prev => [...prev, ...files]);
    }}
    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
    className="p-4 border-2 border-dashed border-gray-300 rounded-md"
  >
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-600">Drag and drop</span> your files here, or
      </p>
      <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition">
        <input
          type="file"
          multiple
          onChange={(e) => {
            if (e.target.files) {
              setFormFiles(prev => [...prev, ...Array.from(e.target.files!)]);
            }
          }}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        />
        <span>Browse Files</span>
      </label>
      <p className="text-xs text-gray-500">
        Supported formats: PDF, DOC, XLS, JPG, PNG. Max file size: 10MB each
      </p>
    </div>
  </DragAndDrop>
  </div>

{/* agreement */}

<div className="mt-6 flex items-start gap-2">
  <input
    type="checkbox"
    id="terms"
    checked={agreedToTerms}
    onChange={() => setAgreedToTerms(!agreedToTerms)}
    className="mt-1"
  />
  
<label htmlFor="terms" className="text-sm text-gray-700">
  I agree to the{" "}
  <Link
    href="/others/agreement"
    target="_blank" // Opens in new tab
    className="text-blue-600 underline hover:text-blue-800"
  >
    terms and conditions
  </Link>
</label>
</div>


      {/* Submit */}
      <button
  type="submit"
  disabled={!agreedToTerms}
  className={`mt-4 px-6 py-3 font-semibold rounded-md shadow transition ${
    agreedToTerms
      ? "bg-green-600 text-white hover:bg-green-700"
      : "bg-gray-300 text-gray-500 cursor-not-allowed"
  }`}
>
  Submit RFQ
</button>
    </form>
  );
};

export default RFQForm;
