'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import DragAndDrop from '@/app/components/ui/dragAndDrop';

// Type definitions
type Supplier = { id: string; name: string; city: string; state: string; zipcode: string; user?: { email?: string } };
type CategoryWithSuppliers = { id: string; name: string; suppliers: Supplier[] };
type FormItem = {
  lineNo: number;
  lineType: string;
  itemNumber: string;
  itemDescription: string;
  brandManufacturer: string;
  origin: string;
  estQuantity: number;
  uom: string;
  currentPrice: number;
  targetPrice: number;
  prValue: number;
};

// Constants for dropdowns
const UOM_OPTIONS = [
  "EA", "BOX", "PKG", "KG", "G", "L", "ML", "M", "CM", "FT", 
  "SQM", "CBM", "HR", "DAY", "LOT", "SET", "PAIR", "ROLL", "PC"
];
const INCOTERMS_OPTIONS = [
  "EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"
];
const LINE_TYPE_OPTIONS = ["Goods", "Services", "Consultancy", "Works", "Lump-sum", "Rate Based"];
const PAYMENT_PROCESS_OPTIONS = ["Credit Card", "Electronic Payment"];

const RFQForm = () => {
  // State management
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [options, setOptions] = useState<any>({
    currencies: [],
    customerCategory: [],
    shippingTypes: [],
    suppliers: [],
    address: [],
    carriers: ["DHL", "DSV", "FedEx"], // Example carriers
  });
  
  const [formData, setFormData] = useState({
    title: '',
    rfqId: '',
    openDateTime: '',
    closeDateType: 'fixed', // 'fixed' or 'days'
    closeDateTime: '',
    daysAfterOpen: 3,
    needByDate: '',
    requesterReference: '',
    shippingAddress: '',
    paymentProcess: '',
    currency: '',
    shippingType: '',
    carrier: '',
    negotiationControls: 'sealed', // 'sealed' or 'unsealed'
    incoterms: '',
    noteToSupplier: '',
    productSpecification: '',
    categoryIds: [] as string[],
    items: [] as FormItem[],
    suppliersSelected: [] as { id: string; email: string }[],
    status: 'draft', // draft, submitted, approved
  });

  const [selectedCategories, setSelectedCategories] = useState<CategoryWithSuppliers[]>([]);
  const [selectedSuppliersMap, setSelectedSuppliersMap] = useState<Record<string, string[]>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [publishOnApproval, setPublishOnApproval] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [manualSupplier, setManualSupplier] = useState({ name: '', email: '', firstName: '', lastName: '' });

  const manualCategory = selectedCategories.find(cat => cat.id === "manual");

  // Helper to get today's date-time for min attribute
  const getMinDateTime = () => new Date().toISOString().slice(0, 16);

  // Fetch initial options for dropdowns
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await axios.get("/api/options/brfq");
        setOptions(prev => ({...prev, ...res.data}));
      } catch (error) {
        console.error("Error fetching options:", error);
      }
    };
    fetchOptions();
  }, []);

  // Update selected suppliers in formData
  useEffect(() => {
    const selectedSuppliers = selectedCategories.flatMap((cat) =>
      (selectedSuppliersMap[cat.id] || []).map((sid) => {
        const supplier = cat.suppliers.find((s) => s.id === sid);
        return supplier ? { id: supplier.id, email: supplier.user?.email || "" } : null;
      })
    ).filter(Boolean) as { id: string; email: string }[];
    setFormData((prev) => ({ ...prev, suppliersSelected: selectedSuppliers }));
  }, [selectedSuppliersMap, selectedCategories]);

  // Update selected category IDs in formData
  useEffect(() => {
    const categoryIds = selectedCategories.map((cat) => cat.id).filter(id => id !== 'manual');
    setFormData((prev) => ({ ...prev, categoryIds }));
  }, [selectedCategories]);

  // Calculate close date when 'daysAfterOpen' changes
  useEffect(() => {
    if (formData.closeDateType === 'days' && formData.openDateTime && formData.daysAfterOpen > 0) {
        const calculateWorkingDays = (startDate: Date, days: number) => {
            let count = 0;
            let currentDate = new Date(startDate);
            while (count < days) {
                currentDate.setDate(currentDate.getDate() + 1);
                const dayOfWeek = currentDate.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Sunday=0, Saturday=6
                    count++;
                }
            }
            return currentDate;
        };
        const openDate = new Date(formData.openDateTime);
        const newCloseDate = calculateWorkingDays(openDate, formData.daysAfterOpen);
        setFormData(prev => ({...prev, closeDateTime: newCloseDate.toISOString().slice(0,16)}));
    }
  }, [formData.closeDateType, formData.openDateTime, formData.daysAfterOpen]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, index?: number) => {
    const { name, value, type } = e.target;
    
    let finalValue: string | number = value;
    if (type === 'number') {
        finalValue = Number(value);
    }
    
    if (index !== undefined) {
      const updatedItems = [...formData.items];
      updatedItems[index] = { ...updatedItems[index], [name]: finalValue };
      setFormData({ ...formData, items: updatedItems });
    } else {
      setFormData({ ...formData, [name]: finalValue });
    }
  };
  
  const addItem = () => {
    const newLineNo = formData.items.length > 0 ? Math.max(...formData.items.map(i => i.lineNo)) + 1 : 1;
    setFormData({
      ...formData,
      items: [...formData.items, {
        lineNo: newLineNo,
        lineType: 'Goods',
        itemNumber: '',
        itemDescription: '',
        brandManufacturer: '',
        origin: '',
        estQuantity: 0,
        uom: '',
        currentPrice: 0,
        targetPrice: 0,
        prValue: 0,
      }],
    });
  };

  const handleSaveDraft = async () => {
    try {
      let rfqId = formData.rfqId;
      // Generate RFQ ID if it doesn't exist (first time saving draft)
      if (!rfqId) {
        const res = await fetch('/api/brfq/generate-id');
        const data = await res.json();
        if (res.ok && data.rfqId) {
          rfqId = data.rfqId;
          setFormData((prev) => ({ ...prev, rfqId: data.rfqId }));
        } else {
          throw new Error("Failed to generate RFQ ID for draft.");
        }
      }
      
      const draftData = { ...formData, rfqId, status: 'draft' };
      const res = await axios.post("/api/brfq/draft", draftData);
      
      if (res.status === 200 || res.status === 201) {
        alert("Draft saved successfully!");
      } else {
        throw new Error(res.data.message || "Failed to save draft");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      alert(error instanceof Error ? error.message : "Failed to save draft");
    }
  };

  const commonSubmitHandler = async (status: 'submitted' | 'approval_pending') => {
    if (!agreedToTerms) {
      alert("Please agree to the terms and conditions");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formDataWithFiles = new FormData();
      formFiles.forEach(file => formDataWithFiles.append('files', file));
      
      const finalRfqData = { ...formData, status };
      formDataWithFiles.append('rfqData', JSON.stringify(finalRfqData));

      const res = await axios.post("/api/brfq", formDataWithFiles, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      if (res.status === 200 || res.status === 201) {
        alert(`RFQ ${status === 'submitted' ? 'submitted' : 'sent for approval'} successfully!`);
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

      const newItems: FormItem[] = jsonData.map((row, index) => ({
        lineNo: formData.items.length + index + 1,
        lineType: row["Line Type"] || 'Goods',
        itemNumber: row["Item Number"] || "",
        itemDescription: row["Item Description"] || "",
        brandManufacturer: row["Brand / Manufacturer"] || "",
        origin: row["Origin"] || "",
        estQuantity: Number(row["Est. Qty"] || 0),
        uom: row["UOM"] || "",
        currentPrice: Number(row["Current Price"] || 0),
        targetPrice: Number(row["Target / Benchmark Price"] || 0),
        prValue: Number(row["PR Value"] || 0),
      }));
      setFormData((prev) => ({ ...prev, items: [...prev.items, ...newItems] }));
    };
    reader.readAsBinaryString(file);
  };
  
  const downloadTemplate = () => {
    const templateData = [{
      "Line Type": "Goods", "Item Number": "", "Item Description": "", 
      "Brand / Manufacturer": "", "Origin": "", "Est. Qty": 0, "UOM": "EA",
      "Current Price": 0, "Target / Benchmark Price": 0, "PR Value": 0
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "RFQ_Items_Template.xlsx");
  };

  const handleManualSupplierSubmit = async (e: React.FormEvent) => {
    // ... same as original ...
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        commonSubmitHandler('submitted');
      }}
      className="max-w-7xl mx-auto px-4 py-10 space-y-10 bg-gray-50"
    >
      {/* --- Top Action Bar --- */}
      <div className="sticky top-0 bg-white shadow-md p-4 z-40 rounded-lg">
          <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-800">Create RFQ</h2>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="publishOnApproval" checked={publishOnApproval} onChange={() => setPublishOnApproval(!publishOnApproval)} />
                    <label htmlFor="publishOnApproval" className="text-sm font-medium">Publish upon approval</label>
                  </div>
                  <button type="button" onClick={() => {/* handle cancel */}} className="px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                  <button type="button" onClick={handleSaveDraft} className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700">Save as Draft</button>
                  <button type="button" onClick={() => commonSubmitHandler('approval_pending')} className="px-4 py-2 rounded-md text-white bg-orange-500 hover:bg-orange-600">Send for Approval</button>
                  <button type="submit" disabled={!agreedToTerms} className={`px-6 py-2 font-semibold rounded-md shadow transition ${agreedToTerms ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>Submit RFQ</button>
              </div>
          </div>
      </div>

      {/* RFQ Title and ID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white shadow rounded-md">
          <label className="block font-semibold text-gray-700 mb-1">RFQ Title</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2" required />
        </div>
        <div className="p-4 bg-white shadow rounded-md">
            <label className="block font-semibold text-gray-700 mb-1">RFQ ID</label>
            <input type="text" name="rfqId" value={formData.rfqId} readOnly className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100" />
        </div>
      </div>
      
      {/* Category + Suppliers Section moved up */}
      <div className="p-4 bg-white shadow rounded-md space-y-4">
        <h3 className="text-xl font-bold">Supplier Selection</h3>
        {/* ... (Supplier and Category JSX from original code) ... */}
      </div>

      {/* RFQ Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date/Time Pickers */}
        <div className="p-4 bg-white shadow rounded-md">
            <label className="block font-semibold text-gray-700 mb-1">Open Date & Time</label>
            <input type="datetime-local" name="openDateTime" value={formData.openDateTime} onChange={handleChange} min={getMinDateTime()} className="w-full border p-2 rounded" required />
        </div>

        <div className="p-4 bg-white shadow rounded-md space-y-2">
            <label className="block font-semibold text-gray-700">Close Date</label>
            <div className="flex items-center gap-4">
                <label><input type="radio" name="closeDateType" value="fixed" checked={formData.closeDateType === 'fixed'} onChange={handleChange} /> Fixed</label>
                <label><input type="radio" name="closeDateType" value="days" checked={formData.closeDateType === 'days'} onChange={handleChange} /> Days After Open</label>
            </div>
            {formData.closeDateType === 'fixed' ? (
                <input type="datetime-local" name="closeDateTime" value={formData.closeDateTime} onChange={handleChange} min={formData.openDateTime || getMinDateTime()} className="w-full border p-2 rounded" required />
            ) : (
                <div className='flex items-center gap-2'>
                  <input type="number" name="daysAfterOpen" value={formData.daysAfterOpen} onChange={handleChange} className="w-full border p-2 rounded" min="1" required />
                  <span>working days</span>
                </div>
            )}
        </div>

        <div className="p-4 bg-white shadow rounded-md">
            <label className="block font-semibold text-gray-700 mb-1">Need by Date</label>
            <input type="date" name="needByDate" value={formData.needByDate} onChange={handleChange} min={formData.closeDateTime.split('T')[0] || getMinDateTime().split('T')[0]} className="w-full border p-2 rounded" />
        </div>

        {/* Other Fields */}
        <div className="p-4 bg-white shadow rounded-md">
          <label className="block font-semibold text-gray-700 mb-1">Requester Reference</label>
          <input type="text" name="requesterReference" value={formData.requesterReference} onChange={handleChange} className="w-full border p-2 rounded" />
        </div>

        <div className="p-4 bg-white shadow rounded-md">
            <label className="block font-semibold text-gray-700 mb-1">Negotiation Controls (Response Visibility)</label>
            <select name="negotiationControls" value={formData.negotiationControls} onChange={handleChange} className="w-full border p-2 rounded">
                <option value="sealed">Sealed</option>
                <option value="unsealed">Unsealed</option>
            </select>
        </div>

        <div className="p-4 bg-white shadow rounded-md">
            <label className="block font-semibold text-gray-700 mb-1">Incoterms</label>
            <select name="incoterms" value={formData.incoterms} onChange={handleChange} className="w-full border p-2 rounded" required>
                <option value="">Select Incoterm</option>
                {INCOTERMS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>

        {/* Dropdown Fields from original code, adapted */}
         {[
          { name: "shippingAddress", label: "Shipping Address", options: options.address, required: true },
          { name: "paymentProcess", label: "Payment Process", options: PAYMENT_PROCESS_OPTIONS.map(p => ({name: p})), required: true },
          { name: "currency", label: "Currency", options: options.currencies, required: true },
          { name: "shippingType", label: "Shipping Type", options: options.shippingTypes, required: true },
          { name: "carrier", label: "Carrier", options: options.carriers.map(c => ({name: c})), required: false },
        ].map((field) => (
          <div key={field.name} className="p-4 bg-white shadow rounded-md">
            <label className="block font-semibold text-gray-700 mb-1">{field.label}</label>
            <select name={field.name} value={(formData as any)[field.name]} onChange={handleChange} className="w-full border p-2 rounded" required={field.required}>
              <option value="">Select {field.label}</option>
              {field.options.map((opt: any, idx: number) => (
                <option key={opt.id || idx} value={field.name === "shippingAddress" ? opt.id : opt.name}>
                  {field.name === "shippingAddress" ? `${opt.street}, ${opt.city}, ${opt.country}` : opt.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Request Items */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Request Items</h2>
        {/* ... (Excel Upload JSX from original, ensure it calls downloadTemplate/handleExcelUpload) ... */}
        
        {/* Item Headers */}
        <div className="grid grid-cols-12 gap-2 font-semibold text-sm px-4 text-gray-600">
            <div className="col-span-1">Line No</div>
            <div className="col-span-1">Line Type</div>
            <div className="col-span-1">Item No</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1">Brand</div>
            <div className="col-span-1">Origin</div>
            <div className="col-span-1">Est. Qty</div>
            <div className="col-span-1">UOM</div>
            <div className="col-span-1">Current Price</div>
            <div className="col-span-1">Target Price</div>
            <div className="col-span-1">PR Value</div>
        </div>

        {/* Manual Item Entry */}
        {formData.items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center bg-white p-2 border rounded-md">
            <input type="text" value={item.lineNo} readOnly className="border px-2 py-1 rounded w-full bg-gray-100 col-span-1" />
            <select name="lineType" value={item.lineType} onChange={(e) => handleChange(e, index)} className="border px-2 py-1 rounded w-full col-span-1">
                {LINE_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <input type="text" name="itemNumber" value={item.itemNumber} onChange={(e) => handleChange(e, index)} placeholder="Item #" className="border px-2 py-1 rounded w-full col-span-1" />
            <input type="text" name="itemDescription" value={item.itemDescription} onChange={(e) => handleChange(e, index)} placeholder="Description" className="border px-2 py-1 rounded w-full col-span-2" />
            <input type="text" name="brandManufacturer" value={item.brandManufacturer} onChange={(e) => handleChange(e, index)} placeholder="Brand" className="border px-2 py-1 rounded w-full col-span-1" />
            <input type="text" name="origin" value={item.origin} onChange={(e) => handleChange(e, index)} placeholder="Origin" className="border px-2 py-1 rounded w-full col-span-1" />
            <input type="number" name="estQuantity" value={item.estQuantity} onChange={(e) => handleChange(e, index)} placeholder="Qty" className="border px-2 py-1 rounded w-full col-span-1" />
            <select name="uom" value={item.uom} onChange={(e) => handleChange(e, index)} className="border px-2 py-1 rounded w-full col-span-1">
              <option value="">UOM</option>
              {UOM_OPTIONS.map(uom => <option key={uom} value={uom}>{uom}</option>)}
            </select>
            <input type="number" name="currentPrice" value={item.currentPrice} onChange={(e) => handleChange(e, index)} placeholder="Current Price" className="border px-2 py-1 rounded w-full col-span-1" />
            <input type="number" name="targetPrice" value={item.targetPrice} onChange={(e) => handleChange(e, index)} placeholder="Target Price" className="border px-2 py-1 rounded w-full col-span-1" />
            <input type="number" name="prValue" value={item.prValue} onChange={(e) => handleChange(e, index)} placeholder="PR Value" className="border px-2 py-1 rounded w-full col-span-1" />
          </div>
        ))}
        <div className="text-right">
          <button type="button" onClick={addItem} className="text-blue-600 text-sm font-medium hover:underline">+ Add Item</button>
        </div>
      </div>


  {/* Manual Suppliers */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-2">Manual Suppliers</h3>
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
