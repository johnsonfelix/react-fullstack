'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import {
  EllipsisVerticalIcon,
  ArrowUturnLeftIcon,
  DocumentDuplicateIcon,
  PrinterIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

type BRFQ = any;

function SafeDateString(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function BrfqDetail() {
  // -------------------------------
  // Hooks (always declared in same order)
  // -------------------------------
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // BRFQ / UI state
  const [brfq, setBrfq] = useState<BRFQ | null>(null);
  const [supplierNames, setSupplierNames] = useState<Record<string, string>>({});
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [shippingAddress, setShippingAddress] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingExtras, setLoadingExtras] = useState(false);

  // Lookup maps (populated from /api/options/brfq)
  const [currencyMap, setCurrencyMap] = useState<Record<string, string>>({});
  const [paymentMap, setPaymentMap] = useState<Record<string, string>>({});
  const [shippingTypeMap, setShippingTypeMap] = useState<Record<string, string>>({});
  const [carrierMap, setCarrierMap] = useState<Record<string, string>>({});
  const [incotermsMap, setIncotermsMap] = useState<Record<string, string>>({});
  const [lookupsLoading, setLookupsLoading] = useState(false);

  // Award flow state
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [justification, setJustification] = useState('');
  const [submittingAward, setSubmittingAward] = useState(false);
  const [awardRules, setAwardRules] = useState<any | null>(null);
  const [awardCheckResult, setAwardCheckResult] = useState<{ ok: boolean; reasons: string[] }>({ ok: true, reasons: [] });

  // -------------------------------
  // Effects (always declared in same order)
  // -------------------------------

  // Fetch brfq details
  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const fetchBrfq = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/brfq/${encodeURIComponent(id)}`);
        const payload = res.data?.data ?? res.data ?? res;
        if (!mounted) return;
        setBrfq(payload);
      } catch (err) {
        console.error('Failed to fetch BRFQ:', err);
        if (mounted) setBrfq(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchBrfq();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Redirect if draft (User request: drafts should be editable, not read-only view)
  useEffect(() => {
    if (brfq && brfq.status === 'draft') {
      router.replace(`/buyer/events/create?rfqId=${brfq.id}`);
    }
  }, [brfq, router]);

  // Fetch suppliers, categories, shipping after brfq loads
  useEffect(() => {
    if (!brfq) return;
    let mounted = true;

    const fetchExtras = async () => {
      try {
        setLoadingExtras(true);

        const suppliersRaw = brfq.suppliersSelected ?? brfq.suppliers ?? [];
        const supplierIds: string[] = Array.isArray(suppliersRaw)
          ? suppliersRaw.map((s: any) => (typeof s === 'string' ? s : s?.id ?? '')).filter(Boolean)
          : [];

        const suppliersData = await Promise.all(
          supplierIds.map(async (sid) => {
            try {
              const r = await axios.get(`/api/suppliers/${encodeURIComponent(sid)}`);
              return r.data?.data ?? r.data ?? r;
            } catch (e) {
              console.warn('Failed to fetch supplier', sid, e);
              return { id: sid, name: sid };
            }
          })
        );

        if (!mounted) return;
        const sMap: Record<string, string> = {};
        suppliersData.forEach((s: any) => {
          if (s && s.id) sMap[s.id] = s.name ?? s.companyName ?? s.title ?? String(s.id);
        });
        setSupplierNames(sMap);

        const catIds = brfq.customerCategory ?? brfq.categoryIds ?? [];
        if (Array.isArray(catIds) && catIds.length > 0) {
          const cats = await Promise.all(
            catIds.map(async (cid: string) => {
              try {
                const r = await axios.get(`/api/categories/${encodeURIComponent(cid)}`);
                const data = r.data?.data ?? r.data ?? r;
                return data;
              } catch (e) {
                console.warn('Failed to fetch category', cid, e);
                return { id: cid, name: cid };
              }
            })
          );
          if (!mounted) return;
          const cMap: Record<string, string> = {};
          cats.forEach((c: any) => {
            if (c && c.id) cMap[c.id] = c.name ?? c.title ?? String(c.id);
          });
          setCategoryNames(cMap);
        }

        const shippingId = brfq.shippingAddress ?? brfq.shipping_address;
        if (shippingId) {
          try {
            const r = await axios.get(`/api/address/${encodeURIComponent(shippingId)}`);
            const addr = r.data?.data ?? r.data ?? r;
            if (mounted) setShippingAddress(addr);
          } catch (e) {
            console.warn('Failed to fetch address', shippingId, e);
            if (mounted) setShippingAddress(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch additional data:', err);
      } finally {
        if (mounted) setLoadingExtras(false);
      }
    };

    fetchExtras();
    return () => {
      mounted = false;
    };
  }, [brfq]);

  // Fetch all option lookups (single call) after brfq loads
  useEffect(() => {
    if (!brfq) return;
    let mounted = true;
    const fetchOptions = async () => {
      setLookupsLoading(true);
      try {
        const res = await axios.get('/api/options/brfq');
        const data = res.data?.data ?? res.data ?? res;
        const mapFromArray = (arr: any[] | undefined) => {
          const m: Record<string, string> = {};
          if (!Array.isArray(arr)) return m;
          for (const it of arr) {
            if (it && it.id) {
              m[it.id] = it.name ?? it.title ?? it.label ?? String(it.id);
            }
          }
          return m;
        };

        if (!mounted) return;
        setCurrencyMap(mapFromArray(data?.currencies ?? data?.currency ?? []));
        setPaymentMap(mapFromArray(data?.payment ?? data?.payments ?? data?.paymentMethods ?? []));
        setShippingTypeMap(mapFromArray(data?.shippingTypes ?? data?.shippingType ?? []));
        setCarrierMap(mapFromArray(data?.carrier ?? data?.carriers ?? []));
        setIncotermsMap(mapFromArray(data?.incoterms ?? []));
      } catch (err) {
        console.warn('Failed to fetch brfq options', err);
      } finally {
        if (mounted) setLookupsLoading(false);
      }
    };

    fetchOptions();
    return () => {
      mounted = false;
    };
  }, [brfq]);

  // Fetch award rules once (admin config)
  useEffect(() => {
    let mounted = true;
    const fetchAwardRules = async () => {
      try {
        const r = await axios.get('/api/admin/workflow/award');
        if (!mounted) return;
        setAwardRules(r.data?.data ?? r.data ?? r);
      } catch (e) {
        if (mounted) {
          setAwardRules({
            rules: [{ id: 'value_threshold', type: 'value_threshold', value: 50000, description: 'Awards > 50k require approval' }],
            notificationMapping: {},
          });
        }
      }
    };
    fetchAwardRules();
    return () => {
      mounted = false;
    };
  }, []);

  // Re-evaluate award rules when selected suppliers or awardRules change
  useEffect(() => {
    const evaluateAwardRules = (): { ok: boolean; reasons: string[] } => {
      const reasons: string[] = [];
      const estValue = computeSelectedValue();
      const splitAward = selectedSuppliers.length > 1;

      if (awardRules?.rules) {
        for (const r of awardRules.rules) {
          const type = typeof r?.type === 'string' ? r.type : String(r?.type ?? '');
          if (type === 'value_threshold') {
            const threshold = Number(r.value) || 0;
            if (estValue > threshold) reasons.push(`Estimated award value ${estValue.toLocaleString()} exceeds threshold ${threshold.toLocaleString()}.`);
          }
          if (type === 'category_threshold' && Array.isArray(r.categories) && r.value) {
            const brfqCategories = brfq?.customerCategory ?? brfq?.categoryIds ?? [];
            if (brfqCategories.some((c: string) => (r.categories || []).includes(c))) {
              const threshold = Number(r.value) || 0;
              if (estValue > threshold) reasons.push(`Category-specific threshold exceeded for categories ${r.categories.join(', ')}.`);
            }
          }
          if (type === 'require_higher_approval_on_split' && splitAward) {
            reasons.push(`Split award to ${selectedSuppliers.length} suppliers requires higher-level approval.`);
          }
        }
      } else {
        if (estValue > 50000) reasons.push(`Estimated award value ${estValue.toLocaleString()} exceeds default threshold 50,000.`);
      }

      return { ok: reasons.length === 0, reasons };
    };

    setAwardCheckResult(evaluateAwardRules());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSuppliers, awardRules, brfq]);

  // -------------------------------
  // Helper functions (no hooks)
  // -------------------------------

  const computeSelectedValue = () => {
    let total = 0;
    if (!brfq) return 0;
    const normalizeQuotes = Array.isArray(brfq.quotes) ? brfq.quotes : brfq.quotes?.data ?? [];
    const quotesBySupplier: Record<string, any[]> = {};
    (normalizeQuotes || []).forEach((quote: any) => {
      const sid = quote.supplierId ?? quote.supplier?.id ?? 'unknown';
      if (!quotesBySupplier[sid]) quotesBySupplier[sid] = [];
      quotesBySupplier[sid].push(quote);
    });

    for (const sid of selectedSuppliers) {
      const quotes = quotesBySupplier[sid] ?? [];
      if (quotes.length === 0) continue;
      const mins = quotes.map((q: any) => (q.items || []).reduce((s: number, it: any) => s + (Number(it.cost) || 0), 0));
      const validMins = mins.filter((v) => !isNaN(v) && isFinite(v));
      if (validMins.length === 0) continue;
      const minVal = Math.min(...validMins);
      if (isFinite(minVal)) total += minVal;
    }
    return total;
  };

  const toggleSupplierSelection = (supplierId: string) => {
    setSelectedSuppliers((prev) => (prev.includes(supplierId) ? prev.filter((s) => s !== supplierId) : [...prev, supplierId]));
  };

  // Determine awarded state and award details
  const isAwarded = Boolean(
    brfq &&
    (String(brfq.status)?.toLowerCase() === 'awarded' ||
      (brfq.award && ((Array.isArray(brfq.award.winners) && brfq.award.winners.length > 0) || brfq.award.winner)))
  );

  const getAwardWinners = (): string[] => {
    if (!brfq) return [];
    const aw = brfq.award ?? {};
    if (Array.isArray(aw.winners) && aw.winners.length > 0) return aw.winners.map((w: any) => (typeof w === 'string' ? w : w?.id ?? String(w)));
    if (Array.isArray(brfq.awardedSuppliers) && brfq.awardedSuppliers.length > 0) return brfq.awardedSuppliers;
    if (aw.winner) return [typeof aw.winner === 'string' ? aw.winner : aw.winner?.id ?? String(aw.winner)];
    return [];
  };

  const getAwardJustification = () => {
    if (!brfq) return '';
    return brfq.award?.justification ?? brfq.award?.note ?? brfq.award?.message ?? brfq.approvalNote ?? '';
  };

  const getAwardedAt = () => {
    if (!brfq) return null;
    return brfq.award?.awardedAt ?? brfq.awardedAt ?? brfq.approvedAt ?? brfq.approved_at ?? brfq.approvedAt;
  };

  const initiateAward = async () => {
    if (!brfq) return;
    if (selectedSuppliers.length === 0) {
      setAwardCheckResult({ ok: false, reasons: ['Please select at least one supplier to award.'] });
      return;
    }
    if (!justification || justification.trim().length < 10) {
      setAwardCheckResult((s) => ({ ...s, reasons: [...s.reasons.filter(Boolean), 'Justification must be at least 10 characters.'] }));
      return;
    }

    const estValue = computeSelectedValue();
    const splitAward = selectedSuppliers.length > 1;
    const check = { ...awardCheckResult };

    setSubmittingAward(true);
    try {
      const payload = {
        brfqId: id,
        supplierIds: selectedSuppliers,
        justification,
        estimatedValue: estValue,
        splitAward,
        checkWarnings: check.reasons,
      };

      const r = await axios.post('/api/awards/initiate', payload);
      const data = r.data?.data ?? r.data ?? r;

      if (data?.approved) {
        // if backend returned award info, use it; otherwise build minimal award object
        const awardObj = data?.award ?? { winners: selectedSuppliers, justification, awardedAt: new Date().toISOString() };
        setBrfq((prev) => (prev ? { ...prev, status: 'awarded', award: awardObj } : prev));

        try {
          await axios.post('/api/notifications/award', {
            brfqId: id,
            winners: selectedSuppliers,
            losers: [], // backend can compute losers; kept simple
            internal: ['procurement-head', 'finance', 'bu'],
            message: `Awarded suppliers for BRFQ ${id}`,
          });
        } catch (sendErr) {
          console.warn('Failed to send notifications', sendErr);
        }

        setShowAwardModal(false);
        setSelectedSuppliers([]);
        setJustification('');
        alert(data?.message ?? 'Award processed and approved.');
      } else {
        // workflow initiated (not auto-approved)
        setShowAwardModal(false);
        setJustification('');
        setSelectedSuppliers([]);
        alert(data?.message ?? 'Approval workflow initiated. Approvers will review the award.');
      }
    } catch (err: any) {
      console.error('Failed to initiate award:', err);
      alert(err?.response?.data?.message ?? 'Failed to initiate award. See console.');
    } finally {
      setSubmittingAward(false);
    }
  };

  // -------------------------------
  // Derived render-time values
  // -------------------------------
  const normalizeQuotes = brfq ? (Array.isArray(brfq.quotes) ? brfq.quotes : brfq.quotes?.data ?? []) : [];
  const supplierIdsNormalized: string[] =
    (brfq && Array.isArray(brfq.suppliersSelected)
      ? brfq.suppliersSelected.map((s: any) => (typeof s === 'string' ? s : s?.id ?? '')).filter(Boolean)
      : []) ?? [];

  const isPaused = brfq
    ? brfq.isPaused === true || brfq.is_paused === true || brfq.paused === true || brfq.status === 'paused'
    : false;

  const approvalStatus = brfq ? brfq.approvalStatus ?? brfq.status ?? brfq.workflowStatus ?? 'open' : 'open';

  const openDateIso = brfq ? brfq.openDateTime ?? brfq.open_date ?? brfq.open : null;
  const openDate = openDateIso ? new Date(openDateIso) : null;
  const isLive = !!openDate && !isNaN(openDate.getTime()) ? openDate <= new Date() && approvalStatus === 'approved' : false;

  const quotesBySupplier: Record<string, any[]> = {};
  (normalizeQuotes || []).forEach((quote: any) => {
    const sid = quote.supplierId ?? quote.supplier?.id ?? 'unknown';
    if (!quotesBySupplier[sid]) quotesBySupplier[sid] = [];
    quotesBySupplier[sid].push(quote);
  });

  const getAverageDelivery = (items: any[] = []) => {
    const deliveryDays = items.map((it) => Number(it.deliveryDays)).filter((d) => !isNaN(d));
    if (deliveryDays.length === 0) return 0;
    const total = deliveryDays.reduce((s, d) => s + d, 0);
    return Math.round(total / deliveryDays.length);
  };

  const quoteSummaries =
    (normalizeQuotes || []).map((quote: any) => {
      const totalCost = (quote.items || []).reduce((sum: number, it: any) => sum + (Number(it.cost) || 0), 0);
      return {
        quoteId: quote.id,
        supplierId: quote.supplierId ?? quote.supplier?.id,
        supplierName: supplierNames[quote.supplierId ?? quote.supplier?.id] ?? quote.supplierName ?? 'Unknown',
        supplierRating: quote.supplierRating ?? 0,
        totalCost,
        averageDelivery: getAverageDelivery(quote.items || []),
        validFor: quote.validFor ?? quote.validity ?? '—',
        currency: quote.currency ?? brfq?.currency,
        items: (quote.items || []).length,
      };
    }) ?? [];

  const bestValueQuote = [...quoteSummaries].sort((a, b) => (a.totalCost ?? Infinity) - (b.totalCost ?? Infinity))[0];
  const fastestDeliveryQuote = [...quoteSummaries].sort((a, b) => (a.averageDelivery ?? Infinity) - (b.averageDelivery ?? Infinity))[0];
  const highestRatedQuote = [...quoteSummaries].sort((a, b) => (b.supplierRating ?? 0) - (a.supplierRating ?? 0))[0];

  const DetailRow = ({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) => (
    <div className={`flex justify-between py-3 px-4 ${className}`}>
      <span className="text-gray-600 font-medium">{label}</span>
      <span className="text-gray-800 text-right max-w-sm">{value ?? '—'}</span>
    </div>
  );

  const closeIso = brfq ? brfq.closeDateTime ?? brfq.close_date ?? brfq.closeDate ?? brfq.close : null;
  const closeDt = closeIso ? new Date(closeIso) : null;
  let formattedCloseDate = '—';
  let formattedCloseTime = '';
  if (closeDt && !isNaN(closeDt.getTime())) {
    formattedCloseDate = closeDt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    formattedCloseTime = closeDt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  const totalQty = brfq ? (brfq.items || []).reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) : 0;

  // helpers to read name from maps with safe fallbacks
  const readCurrencyName = (id?: string | null) => (id ? currencyMap[id] ?? id : '—');
  const readPaymentName = (id?: string | null) => (id ? paymentMap[id] ?? id : '—');
  const readShippingTypeName = (id?: string | null) => (id ? shippingTypeMap[id] ?? id : '—');
  const readCarrierName = (id?: string | null) => (id ? carrierMap[id] ?? id : '—');
  const readIncotermName = (id?: string | null) => (id ? incotermsMap[id] ?? id : '—');

  // -------------------------------
  // Early returns (safe — all hooks already declared)
  // -------------------------------
  if (loading)
    return (
      <div className="p-8 flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );

  if (!brfq)
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load BRFQ details</p>
        <Link href="/events" className="mt-4 inline-flex items-center text-blue-600 hover:underline">
          <ArrowUturnLeftIcon className="w-4 h-4 mr-1" /> Back to events
        </Link>
      </div>
    );

  // Award details derived
  const awardWinners = getAwardWinners();
  const awardJustification = getAwardJustification();
  const awardedAt = getAwardedAt();

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{brfq.title ?? 'BRFQ'}</h1>
          <p className="text-sm text-gray-500">BRFQ #{id}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(brfq)).catch(() => { });
            }}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Copy data to clipboard (duplicate)"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
            Duplicate
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Print"
          >
            <PrinterIcon className="w-4 h-4" />
            Print
          </button>

          <button
            onClick={() => setShowAwardModal(true)}
            disabled={isAwarded}
            className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium ${isAwarded ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            title={isAwarded ? 'Already awarded' : 'Award Recommendation'}
          >
            {isAwarded ? 'Awarded' : 'Award Recommendation'}
          </button>

          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* If awarded — show award details */}
      {isAwarded && (
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">Award Details</h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Winners</div>
              <div className="font-medium text-gray-800 mt-1">
                {awardWinners.length === 0 ? '—' : awardWinners.map((w, i) => (
                  <div key={w} className="inline-block mr-2">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">{supplierNames[w] ?? w}</span>
                    {i < awardWinners.length - 1 && <span className="mx-1" />}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-gray-500">Justification</div>
              <div className="font-medium text-gray-800 mt-1">{awardJustification || '—'}</div>
            </div>

            <div>
              <div className="text-gray-500">Awarded At</div>
              <div className="font-medium text-gray-800 mt-1">{awardedAt ? SafeDateString(awardedAt) : '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Status summary */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-gray-500">Status</p>
            <p className="font-medium">
              <span
                className={`inline-block w-2 h-2 rounded-full mr-2 ${isPaused ? 'bg-yellow-500' : brfq.status === 'closed' || approvalStatus === 'closed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
              />
              {(isPaused && 'PAUSED') || (String(approvalStatus).toUpperCase() ?? 'OPEN')}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-gray-500">Close Date</p>
            <p className="font-medium">
              {formattedCloseDate} {formattedCloseTime ? `at ${formattedCloseTime}` : ''}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-gray-500">Suppliers Invited</p>
            <p className="font-medium">{supplierIdsNormalized.length}</p>
          </div>

          <div className="space-y-1">
            <p className="text-gray-500">Quotes Received</p>
            <p className="font-medium">{(normalizeQuotes || []).length}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          {/* BRFQ Information */}
          <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h2 className="font-semibold text-gray-800">BRFQ Information</h2>
            </div>
            <div className="divide-y divide-gray-200">
              <DetailRow label="Requester" value={brfq.requester ?? brfq.requesterReference ?? '—'} />
              <DetailRow label="Created" value={SafeDateString(brfq.createdAt ?? brfq.created_at ?? brfq.created)} />
              <DetailRow label="Last Updated" value={SafeDateString(brfq.updatedAt ?? brfq.updated_at ?? brfq.updated)} />
              <DetailRow label="Currency" value={readCurrencyName(brfq.currency ?? brfq.currencyId ?? brfq.currency_id)} />
              <DetailRow label="Payment Terms" value={readPaymentName(brfq.paymentProcess ?? brfq.payment_process ?? brfq.paymentProcessId)} />
              <DetailRow label="Shipping Type" value={readShippingTypeName(brfq.shippingType ?? brfq.shipping_type ?? brfq.shippingTypeId)} />

              <div className="py-3 px-4">
                <div className="text-gray-600 font-medium mb-2">Customer Categories</div>
                <div className="flex flex-wrap gap-1">
                  {(brfq.customerCategory ?? brfq.categoryIds ?? []).length > 0
                    ? (brfq.customerCategory ?? brfq.categoryIds ?? []).map((cid: string) => (
                      <span key={cid} className="px-2 py-1 bg-gray-100 rounded-md text-xs">
                        {categoryNames[cid] ?? cid}
                      </span>
                    ))
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Shipping information */}
          {shippingAddress && (
            <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h2 className="font-semibold text-gray-800">Shipping Information</h2>
              </div>
              <div className="divide-y divide-gray-200">
                <DetailRow label="Carrier" value={readCarrierName(brfq.carrier ?? brfq.carrierId ?? brfq.carrier_id)} />
                <DetailRow label="Preferred Delivery" value={brfq.preferredDeliveryTime ?? brfq.preferred_delivery_time ?? '—'} />
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Shipping Address</p>
                  <div className="text-sm text-gray-800 space-y-1">
                    <p>{shippingAddress.line1 ?? shippingAddress.addressLine1 ?? '—'}</p>
                    {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                    <p>
                      {shippingAddress.city ?? ''} {shippingAddress.state ? `, ${shippingAddress.state}` : ''}{' '}
                      {shippingAddress.zip ?? ''}
                    </p>
                    <p>{shippingAddress.country ?? ''}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Requested Items ({(brfq.items ?? []).length})</h2>
              <span className="text-sm text-gray-500">Total Qty: {totalQty}</span>
            </div>
            <div className="divide-y divide-gray-200">
              {(brfq.items ?? []).map((item: any, i: number) => (
                <div key={item.id ?? i} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Item {i + 1}: {item.description ?? item.itemDescription ?? '—'}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                        {item.manufacturer && <span>Manufacturer: <span className="text-gray-800">{item.manufacturer}</span></span>}
                        {item.mfgPartNo && <span>MFG Part #: <span className="text-gray-800">{item.mfgPartNo}</span></span>}
                        {item.internalPartNo && <span>Internal Part #: <span className="text-gray-800">{item.internalPartNo}</span></span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.quantity ?? item.estQuantity ?? 0} {item.uom ?? ''}</p>
                      {item.notes && <p className="text-xs text-gray-500 mt-1">Notes: {item.notes}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quotes summary */}
          {quoteSummaries.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h2 className="font-semibold text-gray-800">Quotes Summary</h2>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {bestValueQuote && (
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-800">Best Value</h3>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {bestValueQuote.currency} {(bestValueQuote.totalCost ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mt-2">
                      <span className="font-medium">{bestValueQuote.supplierName}</span>
                      <span className="text-gray-500 ml-2">({bestValueQuote.items} items)</span>
                    </p>
                    <div className="flex justify-between mt-3 text-sm">
                      <span>Avg. Delivery: <span className="font-medium">{bestValueQuote.averageDelivery} days</span></span>
                      <span>Valid for: <span className="font-medium">{bestValueQuote.validFor}</span></span>
                    </div>
                  </div>
                )}

                {fastestDeliveryQuote && fastestDeliveryQuote.quoteId !== bestValueQuote?.quoteId && (
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-800">Fastest Delivery</h3>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{fastestDeliveryQuote.averageDelivery} days</span>
                    </div>
                    <p className="text-sm mt-2">
                      <span className="font-medium">{fastestDeliveryQuote.supplierName}</span>
                      <span className="text-gray-500 ml-2">({fastestDeliveryQuote.items} items)</span>
                    </p>
                    <div className="flex justify-between mt-3 text-sm">
                      <span>Total: <span className="font-medium">{fastestDeliveryQuote.currency} {(fastestDeliveryQuote.totalCost ?? 0).toLocaleString()}</span></span>
                      <span>Valid for: <span className="font-medium">{fastestDeliveryQuote.validFor}</span></span>
                    </div>
                  </div>
                )}

                {highestRatedQuote && (highestRatedQuote.supplierRating ?? 0) > 0 && (
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-800">Highest Rated</h3>
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        {Array.from({ length: Math.floor(highestRatedQuote.supplierRating) }).map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                      </span>
                    </div>
                    <p className="text-sm mt-2">
                      <span className="font-medium">{highestRatedQuote.supplierName}</span>
                      <span className="text-gray-500 ml-2">({highestRatedQuote.items} items)</span>
                    </p>
                    <div className="flex justify-between mt-3 text-sm">
                      <span>Total: <span className="font-medium">{highestRatedQuote.currency} {(highestRatedQuote.totalCost ?? 0).toLocaleString()}</span></span>
                      <span>Delivery: <span className="font-medium">{highestRatedQuote.averageDelivery} days</span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Supplier Quotes list */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Supplier Quotes ({(normalizeQuotes || []).length})</h2>
              <div className="text-sm text-gray-500">Select supplier(s) on the left to include them in Award Recommendation</div>
            </div>

            {Object.entries(quotesBySupplier).map(([supplierId, quotes]) => (
              <div key={supplierId} className="space-y-4">
                <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-t-lg border">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSuppliers.includes(supplierId)}
                      onChange={() => toggleSupplierSelection(supplierId)}
                      disabled={!(Array.isArray(quotes) && quotes.length > 0) || isAwarded}
                      title={Array.isArray(quotes) && quotes.length > 0 ? 'Select supplier for award' : 'Supplier has no quote'}
                      className="w-4 h-4"
                    />
                    <h3 className="font-medium text-gray-800">
                      {supplierNames[supplierId] ?? supplierId}
                      <span className="ml-2 text-yellow-600 text-sm"> {Array.from({ length: 2 }).map((_, i) => <span key={i}>★</span>)}</span>
                    </h3>
                  </div>
                  <span className="text-sm text-gray-500">{quotes.length} quote{quotes.length > 1 ? 's' : ''}</span>
                </div>

                {quotes.map((quote: any, qIndex: number) => {
                  const totalCost = (quote.items || []).reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0);
                  return (
                    <div key={quote.id ?? qIndex} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                      <div className="border-b p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Quote #{qIndex + 1}</p>
                            {quote.supplierQuoteNo && <p className="text-sm text-gray-600">Supplier Ref: {quote.supplierQuoteNo}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Valid for: {quote.validFor ?? quote.validity ?? '—'}</p>
                            <p className="font-bold text-lg text-blue-600">{quote.currency ?? brfq.currency} {(totalCost ?? 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-200">
                        {(quote.items || []).map((qItem: any, i: number) => {
                          const rItem = brfq.items?.[i] ?? {};
                          return (
                            <div key={qItem.id ?? i} className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{i + 1}. {rItem?.description ?? qItem.itemDescription ?? 'Item'}</p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                                    {qItem.supplierPartNo && <span>Supplier Part #: <span className="text-gray-800">{qItem.supplierPartNo}</span></span>}
                                    <span>Qty: <span className="text-gray-800">{qItem.qty ?? qItem.quantity ?? 0} {qItem.uom ?? rItem.uom ?? ''}</span></span>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="font-medium">{quote.currency ?? brfq.currency} {(Number(qItem.cost) || 0).toFixed(2)}</p>
                                  <p className="text-xs text-gray-500">{(qItem.qty ?? qItem.quantity ?? 0)} × unit</p>
                                  <div className="mt-1 flex justify-end">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                      {qItem.deliveryDays ?? '—'}d delivery
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {quote.comments && (
                        <div className="bg-gray-50 p-4 border-t">
                          <p className="text-sm text-gray-700"><span className="font-medium">Supplier Comments:</span> {quote.comments}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Award Modal */}
      {showAwardModal && !isAwarded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowAwardModal(false)} />

          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full z-10 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <h3 className="text-lg font-semibold">Award Recommendation</h3>
              <button onClick={() => setShowAwardModal(false)} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Selected suppliers: <span className="font-medium">{selectedSuppliers.length}</span></p>
                <p className="text-sm text-gray-600">Estimated award value: <span className="font-medium">{(computeSelectedValue() || 0).toLocaleString()}</span></p>
                <p className="text-sm text-gray-600">Split award: <span className="font-medium">{selectedSuppliers.length > 1 ? 'Yes' : 'No'}</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Justification</label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain why these supplier(s) are recommended (required, min 10 characters)"
                  className="mt-1 block w-full border rounded-md p-2"
                  rows={4}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Rule checks</p>
                {awardCheckResult.reasons.length === 0 ? (
                  <div className="text-sm text-green-700">No rule warnings — award can proceed without extra approvals (client-side check).</div>
                ) : (
                  <div className="text-sm text-red-700 space-y-1">
                    <div>Warnings / rules triggered:</div>
                    <ul className="list-disc pl-5">
                      {awardCheckResult.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                    <div className="text-xs text-gray-500 mt-1">These checks are client-side. Backend workflow will determine final approvers.</div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAwardModal(false);
                  }}
                  className="px-4 py-2 bg-gray-100 rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={initiateAward}
                  disabled={submittingAward}
                  className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
                >
                  {submittingAward ? 'Submitting…' : 'Initiate Approval & Notify'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
