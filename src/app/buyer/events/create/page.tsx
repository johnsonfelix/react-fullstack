'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import {
  AlertCircle,
  Upload,
  X,
  Plus,
  Download,
  Calendar,
  Clock,
  Package,
  FileText,
  Truck,
  DollarSign,
} from 'lucide-react';

// -----------------------
// Types
// -----------------------
type Supplier = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  registrationEmail?: string | null;
  email?: string | null;
  city?: string;
  state?: string;
  zipcode?: string;
  user?: { email?: string | null };
  // allow other unknown fields (friendly for server responses)
  [key: string]: any;
};
type CategoryWithSuppliers = { id: string; name: string; suppliers: Supplier[] };
type FormItem = {
  lineNo: number;
  lineType: string;
  itemNumber: string;
  itemDescription: string;
  brandManufacturer: string;
  origin: string;
  estQuantity: number | '';
  uom: string;
  currentPrice: number | '';
  targetPrice: number | '';
  prValue: number | '';
};
type ValidationErrors = { [key: string]: string };

// -----------------------
// Small presentational components moved outside RFQForm so they're stable
// -----------------------
const InputField = ({ label, name, type = 'text', value, onChange, required = false, error, icon, min, readOnly = false }: any) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
      {icon}
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value ?? ''}
      onChange={onChange}
      min={min}
      readOnly={readOnly}
      className={`w-full px-4 py-2.5 rounded-lg border-2 transition-all ${error ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'} ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} outline-none`}
    />
    {error && (
      <p className="text-sm text-red-600 flex items-center gap-1">
        <AlertCircle size={14} />
        {error}
      </p>
    )}
  </div>
);

const SelectField = ({ label, name, value, onChange, options: opts, required = false, error, icon, placeholder }: any) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
      {icon}
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    <select
      name={name}
      value={value ?? ''}
      onChange={onChange}
      className={`w-full px-4 py-2.5 rounded-lg border-2 transition-all ${error ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'} bg-white outline-none`}
    >
      <option value="">{placeholder || `Select ${label}`}</option>
      {Array.isArray(opts) && opts.map((opt: any, idx: number) => (
        <option key={opt.id || idx} value={opt.value ?? opt.id ?? opt.name}>
          {opt.label ?? opt.name}
        </option>
      ))}
    </select>
    {error && (
      <p className="text-sm text-red-600 flex items-center gap-1">
        <AlertCircle size={14} />
        {error}
      </p>
    )}
  </div>
);

// -----------------------
// RFQForm component
// -----------------------
const RFQForm: React.FC = () => {
  // search / category
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);

  // files & existing attachments (URLs returned from backend)
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [removedFileIndexes, setRemovedFileIndexes] = useState<Set<number>>(new Set());
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]); // attachments already uploaded for draft

  // upload
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  // validation
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  // options (populated from API)
  const [options, setOptions] = useState<any>({
    currencies: [], customerCategory: [], shippingTypes: [], suppliers: [], address: [], carriers: [], uoms: [], incoterms: [], payment: [],
    serviceType: [{ id: 'goods', name: 'Goods' }, { id: 'services', name: 'Services' }],
  });

  // form data
  const [formData, setFormData] = useState<any>({
    title: '',
    rfqId: '',
    openDateTime: '',
    closeDateType: 'fixed',
    closeDateTime: '',
    daysAfterOpen: 3,
    needByDate: '',
    requesterReference: '',
    shippingAddress: '',
    paymentProcess: '',
    currency: '',
    shippingType: '',
    carrier: '',
    negotiationControls: 'sealed',
    incoterms: '',
    noteToSupplier: '',
    productSpecification: '',
    categoryIds: [] as string[],
    items: [] as FormItem[],
    suppliersSelected: [] as { id: string; email: string }[],
    status: 'draft',
  });

  const [selectedCategories, setSelectedCategories] = useState<CategoryWithSuppliers[]>([]);
  const [selectedSuppliersMap, setSelectedSuppliersMap] = useState<Record<string, string[]>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [publishOnApproval, setPublishOnApproval] = useState(true);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [manualSupplier, setManualSupplier] = useState({ name: '', email: '', firstName: '', lastName: '' });

  // compute min datetime once on client
  const getMinDateTime = () => new Date().toISOString().slice(0, 16);

  useEffect(() => {
    setClientMinDateTime(new Date().toISOString().slice(0, 16));
  }, []);

  const [clientMinDateTime, setClientMinDateTime] = useState<string | null>(null);

  // fetch options once
  useEffect(() => {
    let mounted = true;
    axios.get('/api/options/brfq').then((res) => {
      if (!mounted) return;
      setOptions((prev: any) => ({ ...prev, ...res.data }));
    }).catch((err) => {
      console.error('Error fetching options:', err);
    });
    return () => { mounted = false; };
  }, []);

  // Auto-generate RFQ id if not present (only when creating new)
  useEffect(() => {
    const generateId = async () => {
      try {
        if (!formData.rfqId) {
          const res = await fetch('/api/brfq/generate-id');
          const data = await res.json();
          if (res.ok && data.rfqId) {
            setFormData((prev: any) => ({ ...prev, rfqId: data.rfqId }));
          }
        }
      } catch (err) {
        console.error('Could not auto-generate RFQ ID:', err);
      }
    };
    generateId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When serviceType options arrive, ensure any item missing lineType gets a sensible default
useEffect(() => {
  const defaultType = (options.serviceType && options.serviceType[0]?.name) || 'Goods';
  setFormData((prev: any) => {
    if (!prev.items || prev.items.length === 0) return prev;
    const updated = prev.items.map((it: FormItem) => {
      if (!it.lineType || it.lineType === '') return { ...it, lineType: defaultType };
      return it;
    });
    return { ...prev, items: updated };
  });
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [options.serviceType]);

  // Load draft if ?rfqId= is present in URL
  // Load draft if ?rfqId= is present in URL
useEffect(() => {
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const editId = q?.get('rfqId') || q?.get('id') || null;
  if (!editId) return;

  (async () => {
    try {
      const res = await axios.get(`/api/brfq/${encodeURIComponent(editId)}`);
      // support both shapes: { success: true, data: {...} } or {...}
      const payload = res.data?.data ?? res.data ?? null;
      if (!payload) return;

      // helper to convert server date -> "YYYY-MM-DDTHH:mm" for datetime-local
      const toDateTimeLocal = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        // slice to minutes (browser expects this for datetime-local)
        return date.toISOString().slice(0, 16);
      };

      // Map items safely (don't depend on options.serviceType here)
      const mappedItems = Array.isArray(payload.items)
        ? payload.items.map((it: any, idx: number) => ({
            lineNo: idx + 1,
            // try to use whatever the backend gives (lineType / serviceType), fallback to 'Goods'
            lineType: it.lineType ?? it.serviceType ?? 'Goods',
            itemNumber: it.internalPartNo ?? it.itemNumber ?? '',
            itemDescription: it.description ?? it.itemDescription ?? '',
            brandManufacturer: it.manufacturer ?? it.brandManufacturer ?? '',
            origin: it.origin ?? '',
            estQuantity: typeof it.quantity !== 'undefined' ? Number(it.quantity) : (it.estQuantity ?? 0),
            uom: it.uom ?? '',
            currentPrice: it.currentPrice ?? it.current_price ?? 0,
            targetPrice: it.targetPrice ?? it.target_price ?? 0,
            prValue: it.prValue ?? it.pr_value ?? 0,
          }))
        : [];

      // suppliersSelected from backend could be: array of ids OR array of objects
      const suppliersSelectedNormalized = Array.isArray(payload.suppliersSelected)
        ? payload.suppliersSelected.map((s: any) => (typeof s === 'string' ? { id: s, email: '' } : { id: s.id ?? s, email: s.email ?? '' }))
        : [];

      // parse attachmentPath (could be stringified JSON)
      let attachments: string[] = [];
      if (Array.isArray(payload.attachmentPath)) attachments = payload.attachmentPath;
      else if (typeof payload.attachmentPath === 'string' && payload.attachmentPath.trim()) {
        try {
          const parsed = JSON.parse(payload.attachmentPath);
          if (Array.isArray(parsed)) attachments = parsed;
          else attachments = [payload.attachmentPath];
        } catch {
          // not JSON — treat as single URL string
          attachments = [payload.attachmentPath];
        }
      }

      // Build base formData update
      setFormData((prev: any) => ({
        ...prev,
        title: payload.title ?? prev.title,
        rfqId: payload.rfqId ?? prev.rfqId,
        openDateTime: toDateTimeLocal(payload.openDateTime ?? payload.open_date ?? payload.open),
        closeDateTime: toDateTimeLocal(payload.closeDate ?? payload.closeTime ?? payload.close_date ?? payload.close_time ?? payload.close),
        closeDateType: prev.closeDateType, // keep user's default unless they choose otherwise
        daysAfterOpen: prev.daysAfterOpen,
        needByDate: payload.needByDate ? (new Date(payload.needByDate)).toISOString().slice(0,10) : prev.needByDate,
        requesterReference: payload.requester ?? payload.requesterReference ?? prev.requesterReference,
        shippingAddress: payload.shippingAddress ?? payload.shipping_address ?? prev.shippingAddress,
        paymentProcess: payload.paymentProcess ?? prev.paymentProcess ?? prev.paymentProcess,
        currency: payload.currency ?? prev.currency,
        shippingType: payload.shippingType ?? prev.shippingType,
        carrier: payload.carrier ?? prev.carrier,
        negotiationControls: payload.negotiationControls ?? prev.negotiationControls,
        incoterms: payload.incoterms ?? prev.incoterms,
        noteToSupplier: payload.notesToSupplier ?? payload.notesToSupplier ?? payload.noteToSupplier ?? prev.noteToSupplier,
        productSpecification: payload.productSpecification ?? payload.productSpecification ?? prev.productSpecification,
        categoryIds: Array.isArray(payload.customerCategory) ? payload.customerCategory : (Array.isArray(payload.categoryIds) ? payload.categoryIds : prev.categoryIds),
        items: mappedItems.length ? mappedItems : prev.items,
        status: payload.status ?? prev.status,
        suppliersSelected: suppliersSelectedNormalized,
      }));

      // set existing attachments for UI
      setExistingAttachments(attachments);

      // set selectedCategories + selectedSuppliersMap if customerCategory exists (fetch suppliers for each category)
      if (Array.isArray(payload.customerCategory) && payload.customerCategory.length > 0) {
        const cats: CategoryWithSuppliers[] = [];
        await Promise.all(payload.customerCategory.map(async (catId: string) => {
          try {
            const r = await axios.get(`/api/categories/${encodeURIComponent(catId)}`);
            const cat = r.data;
            // try fetch suppliers
            let suppliers: Supplier[] = [];
            try {
              const sres = await axios.get(`/api/categories/${encodeURIComponent(catId)}/suppliers`);
              suppliers = Array.isArray(sres.data) ? sres.data : [];
            } catch { suppliers = []; }
            cats.push({ id: catId, name: cat?.name ?? `Category ${catId}`, suppliers });
          } catch {
            cats.push({ id: catId, name: catId, suppliers: [] });
          }
        }));
        setSelectedCategories(cats);

        // populate selectedSuppliersMap for categories using payload.supplierMap if provided
        // fallback: try to mark suppliersSelected under a synthetic category
        const map: Record<string, string[]> = {};
        // if backend provided an object mapping, try to use it
        if (payload.selectedSuppliersMap && typeof payload.selectedSuppliersMap === 'object') {
          Object.assign(map, payload.selectedSuppliersMap);
        } else {
          // place all supplier ids under a synthetic 'all' key, UI still shows checkboxes per category when supplier lists are fetched
          if (Array.isArray(payload.suppliersSelected)) {
            map['all'] = payload.suppliersSelected.map((s: any) => (typeof s === 'string' ? s : s.id));
          }
        }
        setSelectedSuppliersMap(map);
      } else {
        // If no categories, but suppliersSelected exist, keep them in formData and create a "Manual Suppliers" group
        if (Array.isArray(suppliersSelectedNormalized) && suppliersSelectedNormalized.length > 0) {
          setSelectedCategories((prev) => {
            // create a manual group if not present
            if (!prev.find((c) => c.id === 'manual')) {
              return [...prev, { id: 'manual', name: 'Selected Suppliers', suppliers: suppliersSelectedNormalized.map(s => ({ id: s.id, name: s.id, user: { email: s.email || '' } })) }];
            }
            return prev;
          });
          setSelectedSuppliersMap((prev) => ({ ...prev, manual: suppliersSelectedNormalized.map(s => s.id) }));
        }
      }
    } catch (err) {
      console.error('Failed to load draft', err);
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // Keep suppliersSelected in sync with selectedSuppliersMap + selectedCategories
  useEffect(() => {
  const selectedSuppliers = selectedCategories
    .flatMap((cat) =>
      (selectedSuppliersMap[cat.id] || []).map((sid) => {
        const supplier = cat.suppliers.find((s) => s.id === sid);
        if (!supplier) return null;

        // choose email from top-level, user.email or registrationEmail
        const email = supplier.email ?? supplier.user?.email ?? supplier.registrationEmail ?? '';

        // prefer explicit firstName/lastName; fallback to split name if present
        const firstName =
          supplier.firstName ?? supplier.first_name ?? (typeof supplier.name === 'string' ? supplier.name.split(' ')[0] : null) ?? null;
        const lastName =
          supplier.lastName ?? supplier.last_name ?? (typeof supplier.name === 'string' ? supplier.name.split(' ').slice(1).join(' ') || null : null) ?? null;

        const name = supplier.name ?? supplier.companyName ?? supplier.company ?? '';

        return {
          id: supplier.id,
          email,
          name,
          firstName,
          lastName,
          // include supplier object if you want full detail later (keeps payload flexible)
          supplier,
        };
      })
    )
    .filter(Boolean) as any[];

  setFormData((prev: any) => ({ ...prev, suppliersSelected: selectedSuppliers }));
}, [selectedSuppliersMap, selectedCategories]);

  // Keep categoryIds sync
  useEffect(() => {
    setFormData((prev: any) => ({ ...prev, categoryIds: selectedCategories.map((c) => c.id) }));
  }, [selectedCategories]);

  // Calculate close date when using 'days' option
  useEffect(() => {
    if (formData.closeDateType === 'days' && formData.openDateTime && Number(formData.daysAfterOpen) > 0) {
      const calculateWorkingDays = (startDate: Date, days: number) => {
        let count = 0;
        let currentDate = new Date(startDate);
        while (count < days) {
          currentDate.setDate(currentDate.getDate() + 1);
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
          }
        }
        return currentDate;
      };
      const openDate = new Date(formData.openDateTime);
      const newCloseDate = calculateWorkingDays(openDate, Number(formData.daysAfterOpen));
      setFormData((prev: any) => ({ ...prev, closeDateTime: newCloseDate.toISOString().slice(0, 16) }));
    }
  }, [formData.closeDateType, formData.openDateTime, formData.daysAfterOpen]);

  // -----------------------
  // stable handleChange
  // -----------------------
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, index?: number) => {
    // use e.currentTarget to avoid synthetic event pooling issues
    const target = e.currentTarget as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const name = target.name;
    const type = (target as HTMLInputElement).type;
    const checked = (target as HTMLInputElement).checked;
    const rawValue = target.value;

    let finalValue: any = rawValue;

    if (type === 'number') {
      finalValue = rawValue === '' ? '' : Number(rawValue);
    } else if (type === 'checkbox') {
      finalValue = checked;
    }

    if (typeof index === 'number') {
      setFormData((prev: any) => {
        const updatedItems = [...prev.items];
        updatedItems[index] = { ...updatedItems[index], [name]: finalValue } as FormItem;
        return { ...prev, items: updatedItems };
      });
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: finalValue }));
    }

    // clear validation for this field
    setValidationErrors((prev) => {
      if (!prev[name]) return prev;
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  }, []);

  // -----------------------
  // items management
  // -----------------------
  const addItem = () => {
    setFormData((prev: any) => {
      const newLineNo = prev.items.length > 0 ? Math.max(...prev.items.map((i: any) => i.lineNo)) + 1 : 1;
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            lineNo: newLineNo,
            lineType: (options.serviceType && options.serviceType[0]?.name) || 'Goods',
            itemNumber: '',
            itemDescription: '',
            brandManufacturer: '',
            origin: '',
            estQuantity: 0,
            uom: '',
            currentPrice: 0,
            targetPrice: 0,
            prValue: 0,
          },
        ],
      };
    });

    if (showErrors && validationErrors.items) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy.items;
        return copy;
      });
    }
  };

  const deleteItem = (index: number) => {
    setFormData((prev: any) => {
      const items = [...prev.items];
      items.splice(index, 1);
      return { ...prev, items };
    });
  };

  // -----------------------
  // validation
  // -----------------------
  const validateForm = () => {
    const errors: ValidationErrors = {};

    if (!formData.title || !String(formData.title).trim()) errors.title = 'RFQ Title is required';
    if (!formData.openDateTime) errors.openDateTime = 'Open Date & Time is required';
    if (formData.closeDateType === 'fixed' && !formData.closeDateTime) errors.closeDateTime = 'Close Date & Time is required';
    if (!formData.shippingAddress) errors.shippingAddress = 'Shipping Address is required';
    if (!formData.paymentProcess) errors.paymentProcess = 'Payment Process is required';
    if (!formData.currency) errors.currency = 'Currency is required';
    if (!formData.shippingType) errors.shippingType = 'Shipping Type is required';
    if (!formData.incoterms) errors.incoterms = 'Incoterms is required';
    if (!formData.suppliersSelected || formData.suppliersSelected.length === 0) errors.suppliers = 'At least one supplier must be selected';
    if (!formData.items || formData.items.length === 0) errors.items = 'At least one item must be added';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // -----------------------
  // Save draft (create or update) — sends existingAttachments to server
  // -----------------------
  const handleSaveDraft = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let rfqId = formData.rfqId;
      if (!rfqId) {
        const res = await fetch('/api/brfq/generate-id');
        const data = await res.json();
        if (res.ok && data.rfqId) {
          rfqId = data.rfqId;
          setFormData((prev: any) => ({ ...prev, rfqId }));
        } else {
          throw new Error('Failed to generate RFQ ID for draft.');
        }
      }
      const draftData = { ...formData, rfqId, status: 'draft', publishOnApproval };

      const payload = new FormData();
      // append files
      formFiles.forEach((file, idx) => {
        if (!removedFileIndexes.has(idx)) {
          payload.append('files', file);
        }
      });
      // send existing attachments (URLs) to keep
      payload.append('existingAttachments', JSON.stringify(existingAttachments || []));
      payload.append('rfqData', JSON.stringify(draftData));

      const res = await axios.post('/api/brfq/draft', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      if (res.status === 200 || res.status === 201) {
        alert('Draft saved successfully!');
        // update attachments from response (if provided)
        const created = res.data?.data;
        if (created?.attachmentPath) {
          let attachments = created.attachmentPath;
          if (typeof attachments === 'string') {
            try { attachments = JSON.parse(attachments); } catch { /* ignore */ }
          }
          if (Array.isArray(attachments)) setExistingAttachments(attachments);
        }
        if (created?.rfqId) {
          setFormData((prev: any) => ({ ...prev, rfqId: created.rfqId }));
          // update URL so user can share link to continue editing
          if (typeof window !== 'undefined') {
            const u = new URL(window.location.href);
            u.searchParams.set('rfqId', created.rfqId);
            window.history.replaceState({}, '', u.toString());
          }
        }
      } else {
        throw new Error(res.data?.message || 'Failed to save draft');
      }
    } catch (error: any) {
      console.error('Error saving draft:', error);
      alert(error?.message || 'Failed to save draft');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // -----------------------
  // Common submit handler (submit or send for approval)
  // -----------------------
  const commonSubmitHandler = async (status: 'submitted' | 'approval_pending') => {
    setShowErrors(true);

    if (!validateForm()) {
      alert('Please fill in all required fields');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formDataWithFiles = new FormData();
      formFiles.forEach((file, idx) => {
        if (!removedFileIndexes.has(idx)) {
          formDataWithFiles.append('files', file);
        }
      });

      // include existing attachments (so backend knows to keep them)
      formDataWithFiles.append('existingAttachments', JSON.stringify(existingAttachments || []));

      const finalRfqData = { ...formData, status, publishOnApproval };
      formDataWithFiles.append('rfqData', JSON.stringify(finalRfqData));

      const res = await axios.post('/api/brfq', formDataWithFiles, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      if (res.status === 200 || res.status === 201) {
        alert(`RFQ ${status === 'submitted' ? 'submitted' : 'sent for approval'} successfully!`);
        // redirect or update UI as needed
      } else {
        throw new Error(res.data?.message || 'Failed to create RFQ');
      }
    } catch (error: any) {
      console.error('Error submitting RFQ:', error);
      alert(error?.message || 'Failed to create RFQ');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // -----------------------
  // Excel upload / template
  // -----------------------
  const handleExcelUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;
      const workbook = XLSX.read(data as any, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      const newItems: FormItem[] = jsonData.map((row, index) => ({
        lineNo: formData.items.length + index + 1,
        lineType: row['Line Type'] || (options.serviceType && options.serviceType[0]?.name) || 'Goods',
        itemNumber: row['Item Number'] || '',
        itemDescription: row['Item Description'] || '',
        brandManufacturer: row['Brand / Manufacturer'] || '',
        origin: row['Origin'] || '',
        estQuantity: Number(row['Est. Qty'] || 0),
        uom: row['UOM'] || '',
        currentPrice: Number(row['Current Price'] || 0),
        targetPrice: Number(row['Target / Benchmark Price'] || 0),
        prValue: Number(row['PR Value'] || 0),
      }));
      setFormData((prev: any) => ({ ...prev, items: [...prev.items, ...newItems] }));
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const templateData = [{
      'Line Type': 'Goods', 'Item Number': '', 'Item Description': '',
      'Brand / Manufacturer': '', 'Origin': '', 'Est. Qty': 0, 'UOM': 'EA',
      'Current Price': 0, 'Target / Benchmark Price': 0, 'PR Value': 0
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'RFQ_Items_Template.xlsx');
  };

  // -----------------------
  // Manual supplier add
  // -----------------------
 const handleManualSupplierSubmit = () => {
  if (!manualSupplier.name?.trim()) {
    alert('Company name is required');
    return;
  }

  const id = `manual-${Date.now()}`;
  const first = manualSupplier.firstName?.trim() || null;
  const last = manualSupplier.lastName?.trim() || null;
  const company = manualSupplier.name?.trim() || null;
  const email = manualSupplier.email?.trim() || null;

  const newSupplier: Supplier = {
    id,
    // prefer explicit company name, otherwise use "First Last" if present
    name: company || (first || last ? `${first ?? ''} ${last ?? ''}`.trim() : `manual-${Date.now()}`),
    firstName: first,
    lastName: last,
    companyName: company,
    registrationEmail: email,
    email,
    user: { email },
    city: '',
    state: '',
    zipcode: '',
  };

  // Add to (or create) manual group in selectedCategories
  setSelectedCategories((prev) => {
    const manualIdx = prev.findIndex((c) => c.id === 'manual');
    if (manualIdx !== -1) {
      // avoid duplicates
      const exists = prev[manualIdx].suppliers.find((s) => s.id === id);
      if (exists) return prev;
      const copy = [...prev];
      copy[manualIdx] = { ...copy[manualIdx], suppliers: [...copy[manualIdx].suppliers, newSupplier] };
      return copy;
    } else {
      return [...prev, { id: 'manual', name: 'Manual Suppliers', suppliers: [newSupplier] }];
    }
  });

  // Mark it selected under manual key
  setSelectedSuppliersMap((prev) => {
    const current = Array.isArray(prev.manual) ? prev.manual : (prev['manual'] ?? []);
    const updated = current.includes(id) ? current : [...current, id];
    return { ...prev, manual: updated };
  });

  // reset modal inputs + close
  setManualSupplier({ name: '', email: '', firstName: '', lastName: '' });
  setShowSupplierModal(false);
};


  const toggleRemoveFile = (index: number) => {
    setRemovedFileIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Utility to remove an existing attachment URL (user action)
  const removeExistingAttachmentAt = (idx: number) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // -----------------------
  // UI render (kept largely as you had)
  // -----------------------
  const importInputId = 'excel-import-input';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <form
        onSubmit={(e) => { e.preventDefault(); commonSubmitHandler('submitted'); }}
        className="max-w-7xl mx-auto px-6 py-8 space-y-6"
      >
        {/* Sticky header / actions */}
        <div className="sticky top-0 z-50 bg-white shadow-lg rounded-2xl border border-gray-200 p-6 backdrop-blur-sm bg-opacity-95">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Create RFQ</h1>
              <p className="text-sm text-gray-500 mt-1">Request for Quotation Form</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-100 transition">
                <input type="checkbox" checked={publishOnApproval} onChange={() => setPublishOnApproval((s) => !s)} className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500" />
                <span className="text-sm font-medium text-purple-900">Publish upon approval</span>
              </label>

              <button type="button" onClick={() => window.history.back()} className="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all border border-gray-300">Cancel</button>

              <button type="button" onClick={handleSaveDraft} disabled={isUploading} className="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50">Save as Draft</button>

              <button type="button" onClick={() => commonSubmitHandler('approval_pending')} disabled={isUploading} className="px-5 py-2.5 rounded-lg font-medium text-white bg-orange-500 hover:bg-orange-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50">Send for Approval</button>

              <button type="submit" disabled={!agreedToTerms || isUploading} className={`px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg ${agreedToTerms && !isUploading ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>Submit RFQ</button>
            </div>
          </div>
        </div>

        {/* Upload progress */}
        {isUploading && uploadProgress > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm font-medium text-blue-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* RFQ Basic Info */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><FileText className="text-blue-600" size={24} /> RFQ Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label="RFQ Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              error={validationErrors.title}
              icon={<FileText size={16} className="text-gray-500" />}
            />
            <InputField
              label="RFQ ID"
              name="rfqId"
              value={formData.rfqId}
              readOnly
              icon={<Package size={16} className="text-gray-500" />}
            />
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Calendar className="text-blue-600" size={24} /> Schedule & Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InputField
              label="Open Date & Time"
              name="openDateTime"
              type="datetime-local"
              value={formData.openDateTime}
              onChange={handleChange}
              min={getMinDateTime()}
              required
              error={validationErrors.openDateTime}
              icon={<Clock size={16} className="text-gray-500" />}
            />

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Clock size={16} className="text-gray-500" />
                Close Date
                <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="closeDateType" value="fixed" checked={formData.closeDateType === 'fixed'} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">Fixed Date</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="closeDateType" value="days" checked={formData.closeDateType === 'days'} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">Days After Open</span>
                </label>
              </div>
              {formData.closeDateType === 'fixed' ? (
                <input
                  type="datetime-local"
                  name="closeDateTime"
                  value={formData.closeDateTime}
                  onChange={handleChange}
                  min={formData.openDateTime || getMinDateTime()}
                  className={`w-full px-4 py-2.5 rounded-lg border-2 transition-all ${validationErrors.closeDateTime && showErrors ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'} outline-none`}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="daysAfterOpen"
                    value={formData.daysAfterOpen}
                    onChange={handleChange}
                    min={1}
                    className="w-24 px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                  <span className="text-sm text-gray-600">working days</span>
                </div>
              )}
              {validationErrors.closeDateTime && showErrors && (
                <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle size={14} />
                  {validationErrors.closeDateTime}
                </p>
              )}
            </div>

            <InputField
              label="Need by Date"
              name="needByDate"
              type="date"
              value={formData.needByDate}
              onChange={handleChange}
              min={(formData.closeDateTime ? (formData.closeDateTime as string).split('T')[0] : getMinDateTime().split('T')[0])}
              icon={<Calendar size={16} className="text-gray-500" />}
            />
          </div>
        </div>

        {/* Supplier selection (kept your UI) */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Truck className="text-blue-600" size={24} /> Supplier Selection <span className="text-red-500">*</span></h2>
            <button type="button" onClick={() => setShowSupplierModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition border border-blue-200">
              <Plus size={16} /> Add Manual Supplier
            </button>
          </div>

          {validationErrors.suppliers && showErrors && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle size={16} />
              <span className="text-sm">{validationErrors.suppliers}</span>
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => {
                const val = e.target.value;
                setCategorySearch(val);
                if (val.length > 1) {
                  axios.get(`/api/categories/search?q=${encodeURIComponent(val)}`)
                    .then((res) => setCategoryOptions(res.data || []))
                    .catch((err) => {
                      console.error(err);
                      setCategoryOptions([]);
                    });
                } else {
                  setCategoryOptions([]);
                }
              }}
              placeholder="Search categories..."
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />

            {categoryOptions.length > 0 && (
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {categoryOptions.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => {
                      if (!selectedCategories.find((c) => c.id === cat.id)) {
                        axios.get(`/api/categories/${cat.id}/suppliers`)
                          .then((res) => {
                            setSelectedCategories((prev) => [...prev, { ...cat, suppliers: res.data }]);
                          })
                          .catch((err) => {
                            console.error(err);
                            setSelectedCategories((prev) => [...prev, { ...cat, suppliers: [] }]);
                          });
                      }
                      setCategorySearch('');
                      setCategoryOptions([]);
                    }}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition border-b last:border-b-0"
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            )}

            {selectedCategories.map((cat) => (
              <div key={cat.id} className="border-2 border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">{cat.name}</h3>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategories((prev) => prev.filter((c) => c.id !== cat.id));
                        setSelectedSuppliersMap((prev) => {
                          const { [cat.id]: _, ...rest } = prev;
                          return rest;
                        });
                      }}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cat.suppliers.length === 0 ? (
                    <div className="text-sm text-gray-500">No suppliers found</div>
                  ) : (
                    cat.suppliers.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedSuppliersMap((prev) => {
                            const current = prev[cat.id] || [];
                            const updated = current.includes(s.id) ? current.filter((id) => id !== s.id) : [...current, s.id];
                            return { ...prev, [cat.id]: updated };
                          });
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition ${selectedSuppliersMap[cat.id]?.includes(s.id) ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-50 border-2 border-gray-200 hover:border-blue-300'}`}
                      >
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedSuppliersMap[cat.id]?.includes(s.id) ?? false} readOnly className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-sm text-gray-600">{s.user?.email}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping & Payment */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><DollarSign className="text-blue-600" size={24} /> Shipping & Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SelectField
              label="Shipping Address"
              name="shippingAddress"
              value={formData.shippingAddress}
              onChange={handleChange}
              options={(options.address || []).map((a: any) => ({ id: a.id, label: `${a.street}, ${a.city}, ${a.country}`, value: a.id }))}
              required
              error={validationErrors.shippingAddress}
              icon={<Truck size={16} className="text-gray-500" />}
            />

            <SelectField
              label="Payment Process"
              name="paymentProcess"
              value={formData.paymentProcess}
              onChange={handleChange}
              options={(options.payment || []).map((p: any) => ({ id: p.id, name: p.name, label: p.name, value: p.id }))}
              required
              error={validationErrors.paymentProcess}
              icon={<DollarSign size={16} className="text-gray-500" />}
            />

            <SelectField
              label="Currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              options={options.currencies || []}
              required
              error={validationErrors.currency}
              icon={<DollarSign size={16} className="text-gray-500" />}
            />

            <SelectField
              label="Shipping Type"
              name="shippingType"
              value={formData.shippingType}
              onChange={handleChange}
              options={options.shippingTypes || []}
              required
              error={validationErrors.shippingType}
              icon={<Truck size={16} className="text-gray-500" />}
            />

            <SelectField
              label="Carrier"
              name="carrier"
              value={formData.carrier}
              onChange={handleChange}
              options={(options.carrier || options.carriers || []).map((c: any) => ({ id: c.id, name: c.name, label: c.name, value: c.id }))}
              icon={<Truck size={16} className="text-gray-500" />}
            />

            <SelectField
              label="Incoterms"
              name="incoterms"
              value={formData.incoterms}
              onChange={handleChange}
              options={options.incoterms || []}
              required
              error={validationErrors.incoterms}
              icon={<Package size={16} className="text-gray-500" />}
            />

            <SelectField
              label="Negotiation Controls"
              name="negotiationControls"
              value={formData.negotiationControls}
              onChange={handleChange}
              options={[{ id: 'sealed', name: 'Sealed', label: 'Sealed', value: 'sealed' }, { id: 'unsealed', name: 'Unsealed', label: 'Unsealed', value: 'unsealed' }]}
              icon={<FileText size={16} className="text-gray-500" />}
            />

            <InputField
              label="Requester Reference"
              name="requesterReference"
              value={formData.requesterReference}
              onChange={handleChange}
              icon={<FileText size={16} className="text-gray-500" />}
            />
          </div>
        </div>

        {/* Request Items */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Package className="text-blue-600" size={24} /> Request Items <span className="text-red-500">*</span></h2>
            <div className="flex gap-3">
              <button type="button" onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition border border-green-200">
                <Download size={16} /> Download Template
              </button>

              <input id={importInputId} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) handleExcelUpload(e.target.files[0]); e.currentTarget.value = ''; }} />
              <label htmlFor={importInputId} className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100 transition border border-yellow-200 cursor-pointer"><Plus size={16} /> Import Excel</label>

              <button type="button" onClick={addItem} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition border border-blue-200"><Plus size={16} /> Add Item</button>
            </div>
          </div>

          {validationErrors.items && showErrors && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle size={16} />
              <span className="text-sm">{validationErrors.items}</span>
            </div>
          )}

          {formData.items.length > 0 && (
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                <div className="grid grid-cols-12 gap-2 font-semibold text-xs text-gray-600 mb-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="col-span-1">Line No</div>
                  <div className="col-span-1">Type</div>
                  <div className="col-span-1">Item #</div>
                  <div className="col-span-2">Description</div>
                  <div className="col-span-1">Brand</div>
                  <div className="col-span-1">Origin</div>
                  <div className="col-span-1">Qty</div>
                  <div className="col-span-1">UOM</div>
                  <div className="col-span-1">Current $</div>
                  <div className="col-span-1">Target $</div>
                  <div className="col-span-1">PR Value</div>
                  <div className="col-span-1">Actions</div>
                </div>

                {formData.items.map((item: FormItem, index: number) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center mb-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <input type="text" value={item.lineNo} readOnly className="col-span-1 px-2 py-1.5 rounded border border-gray-300 bg-gray-100 text-sm" />
                    <select name="lineType" value={item.lineType} onChange={(e) => handleChange(e as any, index)} className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm">
                      {(options.serviceType || []).map((opt: any) => <option key={opt.id || opt.name} value={opt.name}>{opt.name}</option>)}
                    </select>
                    <input type="text" name="itemNumber" value={item.itemNumber} onChange={(e) => handleChange(e as any, index)} placeholder="Item #" className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm" />
                    <input type="text" name="itemDescription" value={item.itemDescription} onChange={(e) => handleChange(e as any, index)} placeholder="Description" className="col-span-2 px-2 py-1.5 rounded border border-gray-300 text-sm" />
                    <input type="text" name="brandManufacturer" value={item.brandManufacturer} onChange={(e) => handleChange(e as any, index)} placeholder="Brand" className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm" />
                    <input type="text" name="origin" value={item.origin} onChange={(e) => handleChange(e as any, index)} placeholder="Origin" className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm" />
                    <input type="number" name="estQuantity" value={item.estQuantity ?? ''} onChange={(e) => handleChange(e as any, index)} placeholder="Qty" className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm" />
                    <select name="uom" value={item.uom} onChange={(e) => handleChange(e as any, index)} className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm">
                      <option value="">UOM</option>
                      {(options.uoms || []).map((u: any, i: number) => <option key={u.id || i} value={u.name}>{u.name}</option>)}
                    </select>
                    <input type="number" name="currentPrice" value={item.currentPrice ?? ''} onChange={(e) => handleChange(e as any, index)} placeholder="Price" className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm" />
                    <input type="number" name="targetPrice" value={item.targetPrice ?? ''} onChange={(e) => handleChange(e as any, index)} placeholder="Target" className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm" />
                    <input type="number" name="prValue" value={item.prValue ?? ''} onChange={(e) => handleChange(e as any, index)} placeholder="Value" className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm" />
                    <div className="col-span-1 flex gap-2">
                      <button type="button" onClick={() => deleteItem(index)} className="px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><FileText className="text-blue-600" size={24} /> Additional Information</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Note to Supplier</label>
              <textarea rows={4} placeholder="Enter any notes or instructions for the supplier..." className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none" value={formData.noteToSupplier} onChange={(e) => setFormData((prev: any) => ({ ...prev, noteToSupplier: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Product Specifications</label>
              <textarea rows={4} placeholder="Enter detailed product specifications..." className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none" value={formData.productSpecification} onChange={(e) => setFormData((prev: any) => ({ ...prev, productSpecification: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Upload className="text-blue-600" size={24} /> Attachments</h2>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-all bg-gray-50">
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 mb-2"><span className="font-semibold text-blue-600">Click to upload</span> or drag and drop</p>
            <p className="text-sm text-gray-500">PDF, DOC, XLS, JPG, PNG (max 10MB each)</p>
            <input type="file" multiple onChange={(e) => { if (e.target.files) setFormFiles((prev) => [...prev, ...Array.from(e.target.files)]); }} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" id="file-upload" />
            <label htmlFor="file-upload" className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">Browse Files</label>
          </div>

          {existingAttachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="font-semibold text-gray-800">Previously uploaded</h3>
              {existingAttachments.map((url, idx) => (
                <div key={url + idx} className="flex items-center justify-between p-3 rounded-lg border-2 bg-gray-50 border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{url.split('/').pop()}</p>
                      <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Open</a>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeExistingAttachmentAt(idx)} className="p-2 rounded-lg transition text-red-600 hover:bg-red-100">Remove</button>
                </div>
              ))}
            </div>
          )}

          {formFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="font-semibold text-gray-800">New files (not uploaded)</h3>
              {formFiles.map((f, idx) => (
                <div key={`${f.name}-${idx}`} className={`flex items-center justify-between p-3 rounded-lg border-2 ${removedFileIndexes.has(idx) ? 'bg-red-50 border-red-200 opacity-50' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-gray-400" />
                    <div>
                      <p className={`text-sm font-medium ${removedFileIndexes.has(idx) ? 'line-through' : ''}`}>{f.name}</p>
                      <p className="text-xs text-gray-500">{Math.round(f.size / 1024)} KB</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => toggleRemoveFile(idx)} className={`p-2 rounded-lg transition ${removedFileIndexes.has(idx) ? 'text-green-600 hover:bg-green-100' : 'text-red-600 hover:bg-red-100'}`}>
                    {removedFileIndexes.has(idx) ? 'Undo' : <X size={18} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Terms */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={agreedToTerms} onChange={() => setAgreedToTerms((s) => !s)} className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
            <span className="text-sm text-gray-700">I agree to the{' '}<Link href="/others/agreement" target="_blank" className="text-blue-600 underline hover:text-blue-800 font-medium">terms and conditions</Link></span>
          </label>
        </div>

        {/* Supplier modal */}
        {showSupplierModal && (
          <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add Manual Supplier</h2>
                <button onClick={() => setShowSupplierModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Company Name" className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" value={manualSupplier.name} onChange={(e) => setManualSupplier((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input type="email" placeholder="supplier@company.com" className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" value={manualSupplier.email} onChange={(e) => setManualSupplier((prev) => ({ ...prev, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                  <input type="text" placeholder="First Name" className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" value={manualSupplier.firstName} onChange={(e) => setManualSupplier((prev) => ({ ...prev, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                  <input type="text" placeholder="Last Name" className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" value={manualSupplier.lastName} onChange={(e) => setManualSupplier((prev) => ({ ...prev, lastName: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button onClick={() => setShowSupplierModal(false)} className="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition">Cancel</button>
                  <button onClick={handleManualSupplierSubmit} className="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition">Add Supplier</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </form>
    </div>
  );
};

export default RFQForm;
