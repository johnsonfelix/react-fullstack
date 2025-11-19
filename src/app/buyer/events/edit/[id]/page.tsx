'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  ArrowLeft,
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

// Pause Reason from admin config
type PauseReason = {
  id: string;
  key?: string;
  label: string;
  active: boolean;
};

// -----------------------
// Small presentational components
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
      className={`w-full px-4 py-2.5 rounded-lg border-2 transition-all ${
        error
          ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200'
          : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
      } ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} outline-none`}
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
      className={`w-full px-4 py-2.5 rounded-lg border-2 transition-all ${
        error
          ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200'
          : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
      } bg-white outline-none`}
    >
      <option value="">{placeholder || `Select ${label}`}</option>
      {Array.isArray(opts) &&
        opts.map((opt: any, idx: number) => (
          <option key={opt.id ?? idx} value={opt.value ?? opt.id ?? opt.name}>
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
// Helper utils
// -----------------------
const toLocalDateTimeInput = (d: any) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
};
const nowISO = () => new Date().toISOString();

// get a minimal diff between two objects for selected fields
function computeDiff(original: any, current: any, fields: string[]) {
  const diffs: Record<string, { from: any; to: any }> = {};
  fields.forEach((f) => {
    const ov = original?.[f];
    const nv = current?.[f];
    // simple deep-ish compare for items arrays
    if (f === 'items') {
      const oItems = JSON.stringify(ov ?? []);
      const nItems = JSON.stringify(nv ?? []);
      if (oItems !== nItems) diffs[f] = { from: ov ?? [], to: nv ?? [] };
    } else {
      const oVal = typeof ov === 'undefined' ? null : ov;
      const nVal = typeof nv === 'undefined' ? null : nv;
      if (JSON.stringify(oVal) !== JSON.stringify(nVal)) diffs[f] = { from: oVal, to: nVal };
    }
  });
  return diffs;
}

// -----------------------
// RFQEditForm component
// -----------------------
const RFQEditForm: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const rfqId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [removedFileIndexes, setRemovedFileIndexes] = useState<Set<number>>(new Set());
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  const [options, setOptions] = useState<any>({
    currencies: [],
    customerCategory: [],
    shippingTypes: [],
    suppliers: [],
    address: [],
    carriers: [],
    uoms: [],
    incoterms: [],
    payment: [],
    serviceType: [
      { id: 'goods', name: 'Goods' },
      { id: 'services', name: 'Services' },
    ],
  });

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

  // approval-related states
  const [approvalStatus, setApprovalStatus] = useState<string>('none');
  const [approvalNote, setApprovalNote] = useState<string>('');
  const [approvedBy, setApprovedBy] = useState<string | null>(null);
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  const [approvalRequestedBy, setApprovalRequestedBy] = useState<string | null>(null);
  const [approvalRequestedAt, setApprovalRequestedAt] = useState<string | null>(null);

  // modification/editing flow states
  const [isLive, setIsLive] = useState(false);
  const [isInModificationMode, setIsInModificationMode] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const originalSnapshotRef = useRef<any | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<CategoryWithSuppliers[]>([]);
  const [selectedSuppliersMap, setSelectedSuppliersMap] = useState<Record<string, string[]>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [publishOnApproval, setPublishOnApproval] = useState(true);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [manualSupplier, setManualSupplier] = useState({ name: '', email: '', firstName: '', lastName: '' });
  const [clientMinDateTime, setClientMinDateTime] = useState<string | null>(null);

  const getMinDateTime = () => new Date().toISOString().slice(0, 16);

  // -----------------------
  // Pause / Resume event (buyer controls here)
  // -----------------------
  const [pauseReasons, setPauseReasons] = useState<PauseReason[]>([]);
  const [selectedPauseReasonId, setSelectedPauseReasonId] = useState<string>('');
  const [isPauseActionLoading, setIsPauseActionLoading] = useState(false);

  useEffect(() => {
    setClientMinDateTime(new Date().toISOString().slice(0, 16));
  }, []);

  // Fetch options
  useEffect(() => {
    let mounted = true;
    axios
      .get('/api/options/brfq')
      .then((res) => {
        if (!mounted) return;
        setOptions((prev: any) => ({ ...prev, ...res.data }));
      })
      .catch((err) => {
        console.error('Error fetching options:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch pause reasons (for buyer pause/resume control)
  useEffect(() => {
    let mounted = true;
    axios
      .get('/api/admin/pause-reasons')
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data ?? res.data ?? [];
        const activeOnly: PauseReason[] = (Array.isArray(data) ? data : []).filter((r: any) => r.active);
        setPauseReasons(activeOnly);
        if (activeOnly.length > 0) {
          setSelectedPauseReasonId(activeOnly[0].id);
        }
      })
      .catch((err) => {
        console.error('Error fetching pause reasons:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Load RFQ data for editing
  useEffect(() => {
    if (!rfqId) return;

    const loadRFQData = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(`/api/brfq/${encodeURIComponent(rfqId)}`);
        const payload = res.data?.data ?? res.data ?? null;

        if (!payload) {
          alert('RFQ not found');
          router.push('/events');
          return;
        }

        const mappedItems = Array.isArray(payload.items)
          ? payload.items.map((it: any, idx: number) => ({
              lineNo: idx + 1,
              lineType: it.lineType ?? it.serviceType ?? 'Goods',
              itemNumber: it.internalPartNo ?? it.itemNumber ?? '',
              itemDescription: it.description ?? it.itemDescription ?? '',
              brandManufacturer: it.manufacturer ?? it.brandManufacturer ?? '',
              origin: it.origin ?? it.mfgPartNo ?? '',
              estQuantity: typeof it.quantity !== 'undefined' ? Number(it.quantity) : it.estQuantity ?? 0,
              uom: it.uom ?? '',
              currentPrice: it.currentPrice ?? it.current_price ?? 0,
              targetPrice: it.targetPrice ?? it.target_price ?? 0,
              prValue: it.prValue ?? it.pr_value ?? 0,
            }))
          : [];

        const suppliersSelectedNormalized = Array.isArray(payload.suppliersSelected)
          ? payload.suppliersSelected.map((s: any) =>
              typeof s === 'string' ? { id: s, email: '' } : { id: s.id ?? s, email: s.email ?? '' }
            )
          : [];

        let attachments: string[] = [];
        if (Array.isArray(payload.attachmentPath)) attachments = payload.attachmentPath;
        else if (typeof payload.attachmentPath === 'string' && payload.attachmentPath.trim()) {
          try {
            const parsed = JSON.parse(payload.attachmentPath);
            if (Array.isArray(parsed)) attachments = parsed;
            else attachments = [payload.attachmentPath];
          } catch {
            attachments = [payload.attachmentPath];
          }
        }

        // Populate form fields
        const openLocal = toLocalDateTimeInput(payload.openDateTime ?? payload.open_date ?? payload.open);
        const approvalStatusFromPayload = payload.status ?? payload.status ?? 'none';

        setFormData({
          title: payload.title ?? '',
          rfqId: payload.rfqId ?? rfqId,
          openDateTime: openLocal,
          closeDateTime: toLocalDateTimeInput(
            payload.closeDate ?? payload.closeTime ?? payload.close_date ?? payload.close_time ?? payload.close
          ),
          closeDateType: 'fixed',
          daysAfterOpen: 3,
          needByDate: payload.needByDate ? new Date(payload.needByDate).toISOString().slice(0, 10) : '',
          requesterReference: payload.requester ?? payload.requesterReference ?? '',
          shippingAddress: payload.shippingAddress ?? payload.shipping_address ?? '',
          paymentProcess: payload.paymentProcess ?? '',
          currency: payload.currency ?? '',
          shippingType: payload.shippingType ?? '',
          carrier: payload.carrier ?? '',
          negotiationControls: payload.negotiationControls ?? 'sealed',
          incoterms: payload.incoterms ?? '',
          noteToSupplier: payload.notesToSupplier ?? payload.noteToSupplier ?? '',
          productSpecification: payload.productSpecification ?? '',
          categoryIds: Array.isArray(payload.customerCategory)
            ? payload.customerCategory
            : Array.isArray(payload.categoryIds)
            ? payload.categoryIds
            : [],
          items: mappedItems,
          status: payload.status ?? 'draft',
          suppliersSelected: suppliersSelectedNormalized,
        });

        // approval fields
        setApprovalStatus(approvalStatusFromPayload);
        setApprovalNote(payload.approvalNote ?? payload.approval_note ?? payload.approvalReason ?? '');
        setApprovedBy(payload.approvedBy ?? payload.approved_by ?? null);
        setApprovedAt(
          payload.approvedAt
            ? toLocalDateTimeInput(payload.approvedAt)
            : payload.approved_at
            ? toLocalDateTimeInput(payload.approved_at)
            : null
        );
        setApprovalRequestedBy(payload.approvalRequestedBy ?? payload.approval_requested_by ?? null);
        setApprovalRequestedAt(
          payload.approvalRequestedAt
            ? toLocalDateTimeInput(payload.approvalRequestedAt)
            : payload.approval_requested_at
            ? toLocalDateTimeInput(payload.approval_requested_at)
            : null
        );

        setIsPaused(payload.isPaused === true || payload.is_paused === true || payload.paused === true);

        setExistingAttachments(attachments);

        // derive "live" : approved && openDateTime (start) <= now
        try {
          if (
            (approvalStatusFromPayload === 'approved' ||
              approvalStatusFromPayload === 'approved_by_admin' ||
              payload.published === true) &&
            openLocal
          ) {
            const openDate = new Date(openLocal);
            if (!isNaN(openDate.getTime()) && openDate <= new Date()) {
              setIsLive(true);
            } else {
              setIsLive(false);
            }
          } else {
            setIsLive(false);
          }
        } catch (e) {
          setIsLive(false);
        }

        // Save original snapshot for modification diffs
        originalSnapshotRef.current = {
          title: payload.title ?? '',
          openDateTime: openLocal,
          closeDateTime: toLocalDateTimeInput(
            payload.closeDate ?? payload.closeTime ?? payload.close_date ?? payload.close_time ?? payload.close
          ),
          items: mappedItems,
          negotiationControls: payload.negotiationControls ?? 'sealed',
          suppliersSelected: suppliersSelectedNormalized,
          publishOnApproval: !!payload.publishOnApproval,
          status: payload.status ?? 'draft',
        };

        // Load categories if any (best-effort)
        if (Array.isArray(payload.customerCategory) && payload.customerCategory.length > 0) {
          const cats: CategoryWithSuppliers[] = [];
          await Promise.all(
            payload.customerCategory.map(async (catId: string) => {
              try {
                const r = await axios.get(`/api/categories/${encodeURIComponent(catId)}`);
                const cat = r.data;
                let suppliers: Supplier[] = [];
                try {
                  const sres = await axios.get(`/api/categories/${encodeURIComponent(catId)}/suppliers`);
                  suppliers = Array.isArray(sres.data) ? sres.data : [];
                } catch {
                  suppliers = [];
                }
                cats.push({ id: catId, name: cat?.name ?? `Category ${catId}`, suppliers });
              } catch {
                cats.push({ id: catId, name: catId, suppliers: [] });
              }
            })
          );
          setSelectedCategories(cats);

          const map: Record<string, string[]> = {};
          if (payload.selectedSuppliersMap && typeof payload.selectedSuppliersMap === 'object') {
            Object.assign(map, payload.selectedSuppliersMap);
          } else {
            if (Array.isArray(payload.suppliersSelected)) {
              map['all'] = payload.suppliersSelected.map((s: any) => (typeof s === 'string' ? s : s.id));
            }
          }
          setSelectedSuppliersMap(map);
        } else {
          if (Array.isArray(suppliersSelectedNormalized) && suppliersSelectedNormalized.length > 0) {
            setSelectedCategories([
              {
                id: 'manual',
                name: 'Selected Suppliers',
                suppliers: suppliersSelectedNormalized.map((s) => ({
                  id: s.id,
                  name: s.id,
                  user: { email: s.email || '' },
                })),
              },
            ]);
            setSelectedSuppliersMap({ manual: suppliersSelectedNormalized.map((s) => s.id) });
          }
        }
      } catch (err: any) {
        console.error('Failed to load RFQ', err);
        alert(err?.response?.data?.message || 'Failed to load RFQ data');
        router.push('/events');
      } finally {
        setIsLoading(false);
      }
    };

    loadRFQData();
  }, [rfqId, router]);

  // ensure default lineType set
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
  }, [options.serviceType]);

  // build suppliersSelected when map changes
  useEffect(() => {
  const selectedSuppliers = selectedCategories
    .flatMap((cat) =>
      (selectedSuppliersMap[cat.id] || []).map((sid) => {
        const supplier = cat.suppliers.find((s) => s.id === sid);
        if (!supplier) return null;

        // prefer top-level fields, then fallback to nested or alternate keys
        const email = supplier.user?.email ?? supplier.email ?? supplier.registrationEmail ?? null;
        const name =
          supplier.name ??
          supplier.companyName ??
          supplier.company ??
          supplier.company_name ??
          null;
        const firstName =
          supplier.firstName ??
          supplier.first_name ??
          (typeof supplier.name === "string" ? supplier.name.split(" ")[0] : null) ??
          null;
        const lastName =
          supplier.lastName ??
          supplier.last_name ??
          (typeof supplier.name === "string" ? supplier.name.split(" ").slice(1).join(" ") || null : null) ??
          null;

        // return full object (keep any extra fields by spreading supplier)
        return {
          id: supplier.id,
          email,
          name,
          firstName,
          lastName,
          ...supplier,
        };
      })
    )
    .filter(Boolean);

  setFormData((prev: any) => ({ ...prev, suppliersSelected: selectedSuppliers }));
}, [selectedSuppliersMap, selectedCategories]);

  useEffect(() => {
    setFormData((prev: any) => ({ ...prev, categoryIds: selectedCategories.map((c) => c.id) }));
  }, [selectedCategories]);

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
      setFormData((prev: any) => ({
        ...prev,
        closeDateTime: newCloseDate.toISOString().slice(0, 16),
      }));
    }
  }, [formData.closeDateType, formData.openDateTime, formData.daysAfterOpen]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, index?: number) => {
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

      setValidationErrors((prev) => {
        if (!prev[name]) return prev;
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    },
    []
  );

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
    if (!formData.suppliersSelected || formData.suppliersSelected.length === 0)
      errors.suppliers = 'At least one supplier must be selected';
    if (!formData.items || formData.items.length === 0) errors.items = 'At least one item must be added';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // -----------------------
  // Pause/Resume/Modify flows (Edit Published RFQ)
  // -----------------------
  // Enter modification mode: attempt to pause the event on server, store original snapshot
  const enterModificationMode = async () => {
    if (!rfqId) return;
    setPauseError(null);
    try {
      // attempt to pause on backend (best-effort)
      await axios.post(`/api/brfq/${encodeURIComponent(rfqId)}/pause`).catch(() => {
        /* ignore errors */
      });
      originalSnapshotRef.current = {
        title: formData.title,
        openDateTime: formData.openDateTime,
        closeDateTime: formData.closeDateTime,
        items: JSON.parse(JSON.stringify(formData.items)),
        negotiationControls: formData.negotiationControls,
        publishOnApproval,
        suppliersSelected: formData.suppliersSelected,
      };
      setIsInModificationMode(true);
    } catch (err: any) {
      console.error('Pause error', err);
      setPauseError('Could not pause event. You may still edit locally and create a modification request.');
      setIsInModificationMode(true);
    }
  };

  // Cancel modification mode: revert local edits to original snapshot and attempt to resume
  const cancelModificationMode = async () => {
    const orig = originalSnapshotRef.current;
    if (orig) {
      setFormData((prev: any) => ({
        ...prev,
        title: orig.title,
        openDateTime: orig.openDateTime,
        closeDateTime: orig.closeDateTime,
        items: orig.items,
        negotiationControls: orig.negotiationControls,
        suppliersSelected: orig.suppliersSelected,
      }));
      setPublishOnApproval(!!orig.publishOnApproval);
    }
    try {
      await axios.post(`/api/brfq/${encodeURIComponent(rfqId)}/resume`).catch(() => {});
    } catch (err) {
      console.warn('Resume error', err);
    } finally {
      setIsInModificationMode(false);
      setPauseError(null);
    }
  };

  // When saving while in modification mode: compute diff and open a modification request
  const submitModificationRequest = async (note?: string) => {
    if (!rfqId) return;
    // compute diffs for fields that require approval
    const editableFieldsThatMayRequireApproval = [
      'closeDateTime',
      'items',
      'publishOnApproval',
      'negotiationControls',
      'suppliersSelected',
    ];
    const original = originalSnapshotRef.current ?? {};
    const current = {
      closeDateTime: formData.closeDateTime,
      items: formData.items,
      publishOnApproval,
      negotiationControls: formData.negotiationControls,
      suppliersSelected: formData.suppliersSelected,
    };
    const diffs = computeDiff(original, current, editableFieldsThatMayRequireApproval);
    if (Object.keys(diffs).length === 0) {
      alert('No changes detected that require modification approval.');
      setIsInModificationMode(false);
      try {
        await axios.post(`/api/brfq/${encodeURIComponent(rfqId)}/resume`).catch(() => {});
      } catch {}
      return;
    }

    const payload = {
      brfqId: rfqId,
      requestedBy: 'current_user', // replace with real user id / email if available
      requestedAt: nowISO(),
      requestedFields: Object.keys(diffs),
      summary: diffs,
      note: note || '',
    };

    try {
      const res = await axios.post(`/api/brfq/${encodeURIComponent(rfqId)}/modification-request`, payload);
      if (res.status === 200 || res.status === 201) {
        alert('Modification request submitted — awaiting approval.');
        setIsInModificationMode(false);
        if (res.data?.resume === true) {
          await axios.post(`/api/brfq/${encodeURIComponent(rfqId)}/resume`).catch(() => {});
        }
        router.refresh?.();
      } else {
        throw new Error(res.data?.message || 'Failed to create modification request');
      }
    } catch (err: any) {
      console.error('Error creating modification request', err);
      alert(err?.response?.data?.message || err?.message || 'Failed to submit modification request');
    }
  };

  // -----------------------
  // Direct Pause / Resume (when approved)
  // -----------------------


   async function pauseEvent() {
  if (!rfqId.trim()) return alert("Enter RFQ id to pause");
  if (!selectedPauseReasonId) return alert("Select a reason for pause");
  setIsPauseActionLoading(true);
  try {
    const res = await fetch(`/api/admin/pause-reasons/${encodeURIComponent(rfqId)}/pause`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reasonId: selectedPauseReasonId }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error || "Pause failed");
    }
    alert("Event paused — suppliers and stakeholders have been notified");
    setIsPaused(true);
    setApprovalStatus('paused');
  } catch (err: any) {
    console.error(err);
    alert(err?.message || "Could not pause event");
  } finally {
    setIsPauseActionLoading(false);
  }
}

 async function resumeEvent() {
  if (!rfqId.trim()) return alert("Enter RFQ id to resume");
  if (!confirm("Resume event now? Suppliers will be notified.")) return;
  setIsPauseActionLoading(true);
  try {
    const res = await fetch(`/api/admin/pause-reasons/${encodeURIComponent(rfqId)}/resume`, { method: "POST" });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error || "Resume failed");
    }
    alert("Event resumed — suppliers notified");
    setIsPaused(false);
    setApprovalStatus('approved');
  } catch (err: any) {
    console.error(err);
    alert(err?.message || "Could not resume event");
  } finally {
    setIsPauseActionLoading(false);
  }
}

  // -----------------------
  // Save/update (existing draft flow)
  // -----------------------
  const handleUpdateRFQ = async (status?: string) => {
    setShowErrors(true);

    if (!validateForm()) {
      alert('Please fill in all required fields');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (status !== 'draft' && !agreedToTerms) {
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

      formDataWithFiles.append('existingAttachments', JSON.stringify(existingAttachments || []));

      const finalRfqData = { ...formData, status: status || formData.status, publishOnApproval };
      if (approvalNote) finalRfqData.approvalNote = approvalNote;

      formDataWithFiles.append('rfqData', JSON.stringify(finalRfqData));

      const res = await axios.put(`/api/brfq/${encodeURIComponent(rfqId)}`, formDataWithFiles, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      if (res.status === 200 || res.status === 201) {
        alert('RFQ updated successfully!');
        router.push('/events');
      } else {
        throw new Error(res.data?.message || 'Failed to update RFQ');
      }
    } catch (error: any) {
      console.error('Error updating RFQ:', error);
      alert(error?.response?.data?.message || error?.message || 'Failed to update RFQ');
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
    const templateData = [
      {
        'Line Type': 'Goods',
        'Item Number': '',
        'Item Description': '',
        'Brand / Manufacturer': '',
        Origin: '',
        'Est. Qty': 0,
        UOM: 'EA',
        'Current Price': 0,
        'Target / Benchmark Price': 0,
        'PR Value': 0,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'RFQ_Items_Template.xlsx');
  };

 const handleManualSupplierSubmit = () => {
  if (!manualSupplier.name?.trim()) {
    alert('Company name is required');
    return;
  }

  const id = `manual-${Date.now()}`;
  const newSupplier: Supplier & { firstName?: string; lastName?: string } = {
    id,
    name: manualSupplier.name,
    firstName: manualSupplier.firstName?.trim() || '',
    lastName: manualSupplier.lastName?.trim() || '',
    user: { email: manualSupplier.email?.trim() || '' },
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

  const removeExistingAttachmentAt = (idx: number) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const importInputId = 'excel-import-input';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading RFQ data...</p>
        </div>
      </div>
    );
  }

  // Helper to format "approvedAt" nicely (human-friendly)
  const formatLocalReadable = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleUpdateRFQ('submitted');
        }}
        className="max-w-7xl mx-auto px-6 py-8 space-y-6"
      >
        {/* Sticky header */}
        <div className="top-0 z-50 bg-white shadow-lg rounded-2xl border border-gray-200 p-6 backdrop-blur-sm bg-opacity-95">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Edit RFQ
                </h1>
              </div>
              <p className="text-sm text-gray-500 ml-11">RFQ ID: {formData.rfqId}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-100 transition">
                <input
                  type="checkbox"
                  checked={publishOnApproval}
                  onChange={() => setPublishOnApproval((s) => !s)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-purple-900">Publish upon approval</span>
              </label>

              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all border border-gray-300"
              >
                Cancel
              </button>

              <button
  type="button"
  onClick={() => handleUpdateRFQ('draft')}
  disabled={isUploading || approvalStatus === 'approved' || approvalStatus === 'paused'}
  className="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
>
  Update Draft
</button>

              <button
                type="button"
                onClick={() => handleUpdateRFQ('approval_pending')}
                disabled={isUploading}
                className="px-5 py-2.5 rounded-lg font-medium text-white bg-orange-500 hover:bg-orange-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                Send for Approval
              </button>

              <button
                type="submit"
                disabled={!agreedToTerms || isUploading}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg ${
                  agreedToTerms && !isUploading
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Update & Submit
              </button>
            </div>
          </div>

          {/* Approval status banner */}
          <div className="mt-4">
            {approvalStatus === 'rejected' ? (
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-red-700">Rejected by approver</div>
                    <div className="text-sm text-red-600 mt-1">
                      {approvalNote ? approvalNote : 'No rejection reason provided.'}
                    </div>
                    <div className="text-xs text-red-500 mt-2">
                      {approvedBy ? `Rejected by: ${approvedBy}` : null}{' '}
                      {approvedAt ? ` • ${formatLocalReadable(approvedAt)}` : null}
                    </div>
                  </div>
                  <div className="text-sm text-red-700 font-medium">Approval status: Rejected</div>
                </div>
              </div>
            ) : approvalStatus === 'awarded' ? (
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-green-700">Awarded</div>  
                  </div>
                </div>
              </div>
            ) : approvalStatus === 'approval_pending' ? (
              <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-orange-700">Awaiting approval</div>
                    <div className="text-sm text-orange-600 mt-1">
                      {approvalRequestedBy ? `Requested by ${approvalRequestedBy}` : 'Approval request is pending.'}
                      {approvalRequestedAt ? ` • ${formatLocalReadable(approvalRequestedAt)}` : null}
                    </div>
                  </div>
                  <div className="text-sm text-orange-700 font-medium">Approval status: Pending</div>
                </div>
              </div>
            ) : approvalStatus === 'modifying' ? (
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-blue-700">Under review — modification requested</div>
                    <div className="text-sm text-blue-600 mt-1">
                      Your requested changes have been submitted and are under review by the approver.
                      {approvalNote ? ` Reason: ${approvalNote}` : null}
                    </div>
                    <div className="text-xs text-blue-500 mt-2">
                      {approvalRequestedBy ? `Requested by: ${approvalRequestedBy}` : null}{' '}
                      {approvalRequestedAt ? ` • ${formatLocalReadable(approvalRequestedAt)}` : null}
                    </div>
                  </div>
                  <div className="text-sm text-blue-700 font-medium">Status: Under modification review</div>
                </div>
              </div>
            ) : approvalStatus === 'approved' ? (
  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="font-semibold text-green-700">Approved</div>
        <div className="text-sm text-green-600 mt-1">
          {approvalNote ? approvalNote : 'No approval note.'}
        </div>
        <div className="text-xs text-green-500 mt-2">
          {approvedBy ? `Approved by: ${approvedBy}` : null}{' '}
          {approvedAt ? ` • ${formatLocalReadable(approvedAt)}` : null}
        </div>
      </div>
      <div className="text-sm text-green-700 font-medium">Approval status: Approved</div>
    </div>

    {isLive && !isInModificationMode && !isPaused && (
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={enterModificationMode}
          className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600"
        >
          Edit Event
        </button>
      </div>
    )}

    {isLive && isInModificationMode && (
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => submitModificationRequest()}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Save changes (Request approval)
        </button>
        <button
          type="button"
          onClick={cancelModificationMode}
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200"
        >
          Cancel edit
        </button>
      </div>
    )}

    <div className="mt-4 border-t border-green-200 pt-4">
      <h4 className="text-sm font-semibold text-green-800 mb-2">Pause / Resume Event</h4>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {!isPaused && (
          <select
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm w-full md:w-64"
            value={selectedPauseReasonId}
            onChange={(e) => setSelectedPauseReasonId(e.target.value)}
          >
            <option value="">Select pause reason</option>
            {pauseReasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        )}

        <div className="flex flex-wrap gap-3">
          {!isPaused && (
            <button
              type="button"
              onClick={pauseEvent}
              disabled={isPauseActionLoading || !selectedPauseReasonId}
              className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-60"
            >
              {isPauseActionLoading ? 'Pausing...' : 'Pause Event'}
            </button>
          )}
          
          {isPaused && (
            <button
              type="button"
              onClick={resumeEvent}
              disabled={isPauseActionLoading}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            >
              {isPauseActionLoading ? 'Resuming...' : 'Resume Event'}
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-green-700">
        {isPaused 
          ? 'Event is currently paused. Click Resume to restart the event.'
          : 'Pausing will notify suppliers and stakeholders with the selected reason.'}
      </p>
    </div>
  </div>
) : approvalStatus === 'paused' ? (
  <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="font-semibold text-yellow-700">Event Paused</div>
        <div className="text-sm text-yellow-600 mt-1">
          This event has been paused and suppliers have been notified.
        </div>
      </div>
      <div className="text-sm text-yellow-700 font-medium">Status: Paused</div>
    </div>

    {!isInModificationMode && (
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={enterModificationMode}
          className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600"
        >
          Edit Event
        </button>
      </div>
    )}

    {isInModificationMode && (
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => submitModificationRequest()}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Save changes (Request approval)
        </button>
        <button
          type="button"
          onClick={cancelModificationMode}
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200"
        >
          Cancel edit
        </button>
      </div>
    )}

    <div className="mt-4 border-t border-yellow-200 pt-4">
      <h4 className="text-sm font-semibold text-yellow-800 mb-2">Resume Event</h4>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={resumeEvent}
          disabled={isPauseActionLoading}
          className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
        >
          {isPauseActionLoading ? 'Resuming...' : 'Resume Event'}
        </button>
      </div>
      <p className="mt-1 text-xs text-yellow-700">
        Resuming will notify suppliers and stakeholders that the event has restarted.
      </p>
    </div>
  </div>
            ) : (
              <div className="rounded-lg border-2 border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                No approval activity for this RFQ.
              </div>
            )}
          </div>

          {/* If in modification mode, show banner */}
          {isInModificationMode && (
            <div className="mt-4 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <div className="flex justify-between items-center gap-2">
                <div>
                  <div className="font-semibold text-blue-700">Event paused for modification</div>
                  <div className="text-sm text-blue-600">
                    You're editing a live event. Changes will be sent as a modification request for admin approval. The
                    event is paused while edits are pending.
                  </div>
                  {pauseError && <div className="text-xs text-red-600 mt-1">{pauseError}</div>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => submitModificationRequest()}
                    className="px-3 py-1.5 rounded bg-blue-600 text-white"
                  >
                    Save (create modification request)
                  </button>
                  <button
                    type="button"
                    onClick={cancelModificationMode}
                    className="px-3 py-1.5 rounded bg-gray-100"
                  >
                    Cancel edits
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload progress */}
        {isUploading && uploadProgress > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm font-medium text-blue-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* RFQ Basic Info */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FileText className="text-blue-600" size={24} /> RFQ Information
          </h2>
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
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} /> Schedule & Timeline
          </h2>
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
                  <input
                    type="radio"
                    name="closeDateType"
                    value="fixed"
                    checked={formData.closeDateType === 'fixed'}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Fixed Date</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="closeDateType"
                    value="days"
                    checked={formData.closeDateType === 'days'}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600"
                  />
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
                  className={`w-full px-4 py-2.5 rounded-lg border-2 transition-all ${
                    validationErrors.closeDateTime && showErrors
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                  } outline-none`}
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
              min={
                formData.closeDateTime
                  ? (formData.closeDateTime as string).split('T')[0]
                  : getMinDateTime().split('T')[0]
              }
              icon={<Calendar size={16} className="text-gray-500" />}
            />
          </div>
        </div>

        {/* Supplier selection */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Truck className="text-blue-600" size={24} /> Supplier Selection <span className="text-red-500">*</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowSupplierModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition border border-blue-200"
            >
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
                  axios
                    .get(`/api/categories/search?q=${encodeURIComponent(val)}`)
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
                        axios
                          .get(`/api/categories/${cat.id}/suppliers`)
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
                            const updated = current.includes(s.id)
                              ? current.filter((id) => id !== s.id)
                              : [...current, s.id];
                            return { ...prev, [cat.id]: updated };
                          });
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition ${
                          selectedSuppliersMap[cat.id]?.includes(s.id)
                            ? 'bg-blue-100 border-2 border-blue-400'
                            : 'bg-gray-50 border-2 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedSuppliersMap[cat.id]?.includes(s.id) ?? false}
                            readOnly
                            className="w-4 h-4"
                          />
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
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <DollarSign className="text-blue-600" size={24} /> Shipping & Payment Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SelectField
              label="Shipping Address"
              name="shippingAddress"
              value={formData.shippingAddress}
              onChange={handleChange}
              options={(options.address || []).map((a: any) => ({
                id: a.id,
                label: `${a.street}, ${a.city}, ${a.country}`,
                value: a.id,
              }))}
              required
              error={validationErrors.shippingAddress}
              icon={<Truck size={16} className="text-gray-500" />}
            />

            <SelectField
              label="Payment Process"
              name="paymentProcess"
              value={formData.paymentProcess}
              onChange={handleChange}
              options={(options.payment || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                label: p.name,
                value: p.id,
              }))}
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
              options={(options.carrier || options.carriers || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                label: c.name,
                value: c.id,
              }))}
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
              options={[
                { id: 'sealed', name: 'Sealed', label: 'Sealed', value: 'sealed' },
                { id: 'unsealed', name: 'Unsealed', label: 'Unsealed', value: 'unsealed' },
              ]}
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
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="text-blue-600" size={24} /> Request Items <span className="text-red-500">*</span>
            </h2>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition border border-green-200"
              >
                <Download size={16} /> Download Template
              </button>

              <input
                id={importInputId}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleExcelUpload(e.target.files[0]);
                  e.currentTarget.value = '';
                }}
              />
              <label
                htmlFor={importInputId}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100 transition border border-yellow-200 cursor-pointer"
              >
                <Plus size={16} /> Import Excel
              </label>

              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition border border-blue-200"
              >
                <Plus size={16} /> Add Item
              </button>
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
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-center mb-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <input
                      type="text"
                      value={item.lineNo}
                      readOnly
                      className="col-span-1 px-2 py-1.5 rounded border border-gray-300 bg-gray-100 text-sm"
                    />
                    <select
                      name="lineType"
                      value={item.lineType}
                      onChange={(e) => handleChange(e as any, index)}
                      className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm"
                    >
                      {(options.serviceType || []).map((opt: any) => (
                        <option key={opt.id || opt.name} value={opt.name}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="itemNumber"
                      value={item.itemNumber}
                      onChange={(e) => handleChange(e as any, index)}
                      placeholder="Item #"
                      className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm"
                    />
                    <input
                      type="text"
                      name="itemDescription"
                      value={item.itemDescription}
                      onChange={(e) => handleChange(e as any, index)}
                      placeholder="Description"
                      className="col-span-2 px-2 py-1.5 rounded border border-gray-300 text-sm"
                    />
                    <input
                      type="text"
                      name="brandManufacturer"
                      value={item.brandManufacturer}
                      onChange={(e) => handleChange(e as any, index)}
                      placeholder="Brand"
                      className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm"
                    />
                    <input
                      type="text"
                      name="origin"
                      value={item.origin}
                      onChange={(e) => handleChange(e as any, index)}
                      placeholder="Origin"
                      className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm"
                    />
                    <input
                      type="number"
                      name="estQuantity"
                      value={item.estQuantity ?? ''}
                      onChange={(e) => handleChange(e as any, index)}
                      placeholder="Qty"
                      className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm"
                    />
                    <select
                      name="uom"
                      value={item.uom}
                      onChange={(e) => handleChange(e as any, index)}
                      className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm"
                    >
                      <option value="">UOM</option>
                      {(options.uoms || []).map((u: any, i: number) => (
                        <option key={u.id || i} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      name="currentPrice"
                      value={item.currentPrice ?? ''}
                      onChange={(e) => handleChange(e as any, index)}
                      placeholder="Price"
                      className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm"
                    />
                    <input
                      type="number"
                      name="targetPrice"
                      value={item.targetPrice ?? ''}
                      onChange={(e) => handleChange(e as any, index)}
                      placeholder="Target"
                      className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm"
                    />
                    <input
                      type="number"
                      name="prValue"
                      value={item.prValue ?? ''}
                      onChange={(e) => handleChange(e as any, index)}
                      placeholder="Value"
                      className="col-span-1 px-2 py-1.5 rounded border border-gray-300 text-sm"
                    />
                    <div className="col-span-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => deleteItem(index)}
                        className="px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FileText className="text-blue-600" size={24} /> Additional Information
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Note to Supplier</label>
              <textarea
                rows={4}
                placeholder="Enter any notes or instructions for the supplier..."
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                value={formData.noteToSupplier}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, noteToSupplier: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Product Specifications</label>
              <textarea
                rows={4}
                placeholder="Enter detailed product specifications..."
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                value={formData.productSpecification}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, productSpecification: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Upload className="text-blue-600" size={24} /> Attachments
          </h2>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-all bg-gray-50">
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 mb-2">
              <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-gray-500">PDF, DOC, XLS, JPG, PNG (max 10MB each)</p>
            <input
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) setFormFiles((prev) => [...prev, ...Array.from(e.target.files)]);
              }}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition"
            >
              Browse Files
            </label>
          </div>

          {existingAttachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="font-semibold text-gray-800">Previously uploaded</h3>
              {existingAttachments.map((url, idx) => (
                <div
                  key={url + idx}
                  className="flex items-center justify-between p-3 rounded-lg border-2 bg-gray-50 border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{url.split('/').pop()}</p>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExistingAttachmentAt(idx)}
                    className="p-2 rounded-lg transition text-red-600 hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {formFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="font-semibold text-gray-800">New files (not uploaded)</h3>
              {formFiles.map((f, idx) => (
                <div
                  key={`${f.name}-${idx}`}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                    removedFileIndexes.has(idx)
                      ? 'bg-red-50 border-red-200 opacity-50'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-gray-400" />
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          removedFileIndexes.has(idx) ? 'line-through' : ''
                        }`}
                      >
                        {f.name}
                      </p>
                      <p className="text-xs text-gray-500">{Math.round(f.size / 1024)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleRemoveFile(idx)}
                    className={`p-2 rounded-lg transition ${
                      removedFileIndexes.has(idx)
                        ? 'text-green-600 hover:bg-green-100'
                        : 'text-red-600 hover:bg-red-100'
                    }`}
                  >
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
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={() => setAgreedToTerms((s) => !s)}
              className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I agree to the{' '}
              <Link
                href="/others/agreement"
                target="_blank"
                className="text-blue-600 underline hover:text-blue-800 font-medium"
              >
                terms and conditions
              </Link>
            </span>
          </label>
        </div>

        {/* Supplier modal */}
        {showSupplierModal && (
          <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add Manual Supplier</h2>
                <button
                  onClick={() => setShowSupplierModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Company Name"
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={manualSupplier.name}
                    onChange={(e) =>
                      setManualSupplier((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="supplier@company.com"
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={manualSupplier.email}
                    onChange={(e) =>
                      setManualSupplier((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    placeholder="First Name"
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={manualSupplier.firstName}
                    onChange={(e) =>
                      setManualSupplier((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={manualSupplier.lastName}
                    onChange={(e) =>
                      setManualSupplier((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowSupplierModal(false)}
                    className="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleManualSupplierSubmit}
                    className="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition"
                  >
                    Add Supplier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default RFQEditForm;
