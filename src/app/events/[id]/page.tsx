"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { EllipsisVerticalIcon, ArrowUturnLeftIcon, DocumentDuplicateIcon, PrinterIcon } from "@heroicons/react/24/outline";
import { Popover } from "@headlessui/react";

export default function BrfqDetail() {
  const { id } = useParams();
  const [brfq, setBrfq] = useState<any>(null);
  const [supplierNames, setSupplierNames] = useState<Record<string, string>>({});
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [shippingAddress, setShippingAddress] = useState<any>(null);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/brfq/${id}`);
        const data = await res.json();
        setBrfq(data);
      } catch (error) {
        console.error("Failed to fetch BRFQ:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!brfq) return;

    const fetchAdditionalData = async () => {
      try {
        // Fetch suppliers
        
    
      const data = await Promise.all(
        brfq.suppliersSelected?.map((id: string) =>
          fetch(`/api/suppliers/${id}`).then(res => res.json())
        )        
      );

      console.log(data);
      

      const map: Record<string, string> = {};
      data.forEach((s: any) => map[s.id] = s.name);
      setSupplierNames(map);
      
      


        // Fetch categories
        if (brfq.customerCategory?.length) {
          const categoriesData = await Promise.all(
            brfq.customerCategory.map((id: string) =>
              fetch(`/api/categories/${id}`).then(res => res.json())
            )
          );
          const categoriesMap = categoriesData.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});
          setCategoryNames(categoriesMap);
        }

        // Fetch address
        if (brfq.shippingAddress) {
          const addressData = await fetch(`/api/address/${brfq.shippingAddress}`).then(res => res.json());
          setShippingAddress(addressData);
        }

        // Fetch exchange rates
        if (brfq.currency) {
          const res = await fetch(`https://v6.exchangerate-api.com/v6/62f62d1142f3c0cfe977e7b0/latest/${brfq.currency}`);
          const data = await res.json();
          setExchangeRates(data.conversion_rates || {});
        }
      } catch (error) {
        console.error("Failed to fetch additional data:", error);
      }
    };

    fetchAdditionalData();
  }, [brfq]);

  const convertToBrfqCurrency = (
    amount: number,
    fromCurrency: string,
    exchangeRates: Record<string, number>
  ): number => {
    if (!exchangeRates || !exchangeRates[fromCurrency]) return amount;
    const rate = exchangeRates[fromCurrency];
    return amount / rate;
  };

  if (loading) return (
    <div className="p-8 flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (!brfq) return (
    <div className="p-8 text-center">
      <p className="text-red-500">Failed to load BRFQ details</p>
      <Link href="/events" className="mt-4 inline-flex items-center text-blue-600 hover:underline">
        <ArrowUturnLeftIcon className="w-4 h-4 mr-1" /> Back to events
      </Link>
    </div>
  );

  const DetailRow = ({ label, value, className = "" }: { label: string; value: string | React.ReactNode, className?: string }) => (
    <div className={`flex justify-between py-3 px-4 ${className}`}>
      <span className="text-gray-600 font-medium">{label}</span>
      <span className="text-gray-800 text-right max-w-sm">{value || "—"}</span>
    </div>
  );

  const quotesBySupplier: Record<string, any[]> = {};
  brfq.quotes?.forEach((quote: any) => {
    if (!quote.supplierId) return;
    if (!quotesBySupplier[quote.supplierId]) {
      quotesBySupplier[quote.supplierId] = [];
    }
    quotesBySupplier[quote.supplierId].push(quote);
  });

  const getAverageDelivery = (items: any[]) => {
    const deliveryDays = items
      .map((item) => Number(item.deliveryDays))
      .filter((d) => !isNaN(d));

    if (deliveryDays.length === 0) return 0;

    const total = deliveryDays.reduce((sum, days) => sum + days, 0);
    return Math.round(total / deliveryDays.length);
  };

  const quoteSummaries = brfq.quotes?.map((quote: any) => {
    const totalCost = quote.items?.reduce(
      (sum: number, item: any) =>
        sum + convertToBrfqCurrency(item.cost ?? 0, quote.currency, exchangeRates),
      0
    );

    const averageDelivery = getAverageDelivery(quote.items || []);

    return {
      quoteId: quote.id,
      supplierId: quote.supplierId,
      supplierName: supplierNames[quote.supplierId],
      supplierRating: 0 || 0,
      totalCost,
      averageDelivery,
      validFor: quote.validFor,
      currency: brfq.currency,
      items: quote.items?.length || 0,
    };
  }) ?? [];

  const bestValueQuote = [...quoteSummaries].sort((a, b) => a.totalCost - b.totalCost)[0];
  const fastestDeliveryQuote = [...quoteSummaries].sort((a, b) => a.averageDelivery - b.averageDelivery)[0];
  const highestRatedQuote = [...quoteSummaries].sort((a, b) => b.supplierRating - a.supplierRating)[0];

  // Format date and time
  const closeDate = new Date(brfq.closeDate);
  const closeTime = new Date(brfq.closeTime);
  const formattedCloseDate = closeDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formattedCloseTime = closeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{brfq.title}</h1>
          <p className="text-sm text-gray-500">BRFQ #{id}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <DocumentDuplicateIcon className="w-4 h-4" />
            Duplicate
          </button>
          <button className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <PrinterIcon className="w-4 h-4" />
            Print
          </button>
          <Link href="/events" className="flex items-center gap-1 px-3 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700">
            <ArrowUturnLeftIcon className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>

      {/* Status and Summary Bar */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-gray-500">Status</p>
            <p className="font-medium">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${brfq.status === 'closed' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              {brfq.status?.toUpperCase() || 'OPEN'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-gray-500">Close Date</p>
            <p className="font-medium">{formattedCloseDate} at {formattedCloseTime}</p>
          </div>
          <div className="space-y-1">
            <p className="text-gray-500">Suppliers Invited</p>
            <p className="font-medium">{brfq.suppliersSelected?.length || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-gray-500">Quotes Received</p>
            <p className="font-medium">{brfq.quotes?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - BRFQ Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* BRFQ Information */}
          <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h2 className="font-semibold text-gray-800">BRFQ Information</h2>
            </div>
            <div className="divide-y divide-gray-200">
              <DetailRow label="Requester" value={brfq.requester} />
              <DetailRow label="Created" value={new Date(brfq.createdAt).toLocaleString()} />
              <DetailRow label="Last Updated" value={new Date(brfq.updatedAt).toLocaleString()} />
              <DetailRow label="Currency" value={brfq.currency} />
              <DetailRow label="Payment Terms" value={brfq.paymentProcess} />
              <DetailRow label="Shipping Type" value={brfq.shippingType} />
              <DetailRow label="Urgency" value={
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  brfq.urgency === 'high' ? 'bg-red-100 text-red-800' : 
                  brfq.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {brfq.urgency}
                </span>
              } />
              <DetailRow label="Customer Categories" value={
                <div className="flex flex-wrap gap-1">
                  {brfq.customerCategory?.map((id: string) => (
                    <span key={id} className="px-2 py-1 bg-gray-100 rounded-md text-xs">
                      {categoryNames[id] || id}
                    </span>
                  )) || "—"}
                </div>
              } />
            </div>
          </div>

          {/* Shipping Information */}
          {shippingAddress && (
            <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h2 className="font-semibold text-gray-800">Shipping Information</h2>
              </div>
              <div className="divide-y divide-gray-200">
                <DetailRow label="Carrier" value={brfq.carrier || "—"} />
                <DetailRow label="Preferred Delivery" value={brfq.preferredDeliveryTime || "—"} />
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Shipping Address</p>
                  <div className="text-sm text-gray-800 space-y-1">
                    <p>{shippingAddress.line1}</p>
                    {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                    <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}</p>
                    <p>{shippingAddress.country}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Items and Quotes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Requested Items */}
          <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Requested Items ({brfq.items?.length || 0})</h2>
              <span className="text-sm text-gray-500">Total Qty: {brfq.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)}</span>
            </div>
            <div className="divide-y divide-gray-200">
              {brfq.items?.map((item: any, i: number) => (
                <div key={item.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Item {i + 1}: {item.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                        {item.manufacturer && <span>Manufacturer: <span className="text-gray-800">{item.manufacturer}</span></span>}
                        {item.mfgPartNo && <span>MFG Part #: <span className="text-gray-800">{item.mfgPartNo}</span></span>}
                        {item.internalPartNo && <span>Internal Part #: <span className="text-gray-800">{item.internalPartNo}</span></span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.quantity} {item.uom}</p>
                      {item.notes && <p className="text-xs text-gray-500 mt-1">Notes: {item.notes}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supplier Quotes Summary */}
          {quoteSummaries.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h2 className="font-semibold text-gray-800">Quotes Summary</h2>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Best Value */}
                {bestValueQuote && (
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-800">Best Value</h3>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">${bestValueQuote.totalCost.toLocaleString()}</span>
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

                {/* Fastest Delivery */}
                {fastestDeliveryQuote && fastestDeliveryQuote.quoteId !== bestValueQuote.quoteId && (
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
                      <span>Total: <span className="font-medium">{brfq.currency} {fastestDeliveryQuote.totalCost.toLocaleString()}</span></span>
                      <span>Valid for: <span className="font-medium">{fastestDeliveryQuote.validFor}</span></span>
                    </div>
                  </div>
                )}

                {/* Highest Rated */}
                {highestRatedQuote && highestRatedQuote.supplierRating > 0 && (
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
                      <span>Total: <span className="font-medium">{brfq.currency} {highestRatedQuote.totalCost.toLocaleString()}</span></span>
                      <span>Delivery: <span className="font-medium">{highestRatedQuote.averageDelivery} days</span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Supplier Quotes */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Supplier Quotes ({brfq.quotes?.length || 0})</h2>
            
            {Object.entries(quotesBySupplier).map(([supplierId, quotes]) => (
              <div key={supplierId} className="space-y-4">
                <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-t-lg border">
                  <h3 className="font-medium text-gray-800">
                    {supplierNames[supplierId]}
                    {  (
                      <span className="ml-2 text-yellow-600 text-sm">
                        {Array.from({ length: Math.floor(2) }).map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                      </span>
                    )}
                  </h3>
                  <span className="text-sm text-gray-500">{quotes.length} quote{quotes.length > 1 ? 's' : ''}</span>
                </div>

                {quotes.map((quote: any, qIndex: number) => {
                  const totalCost = quote.items?.reduce(
                    (sum: number, item: any) =>
                      sum + convertToBrfqCurrency(item.cost ?? 0, quote.currency, exchangeRates),
                    0
                  );

                  return (
                    <div key={quote.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                      <div className="border-b p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Quote #{qIndex + 1}</p>
                            {quote.supplierQuoteNo && (
                              <p className="text-sm text-gray-600">Supplier Ref: {quote.supplierQuoteNo}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Valid for: {quote.validFor}</p>
                            <p className="font-bold text-lg text-blue-600">
                              {brfq.currency} {totalCost?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-200">
                        {quote.items?.map((qItem: any, i: number) => {
                          const rItem = brfq.items?.[i];
                          const convertedCost = convertToBrfqCurrency(qItem.cost ?? 0, quote.currency, exchangeRates);
                          const convertedUnit = convertToBrfqCurrency(qItem.unitPrice ?? 0, quote.currency, exchangeRates);

                          return (
                            <div key={qItem.id} className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{i + 1}. {rItem?.description || "Item"}</p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                                    {qItem.supplierPartNo && (
                                      <span>Supplier Part #: <span className="text-gray-800">{qItem.supplierPartNo}</span></span>
                                    )}
                                    <span>Qty: <span className="text-gray-800">{qItem.qty} {qItem.uom}</span></span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">
                                    {brfq.currency} {convertedCost?.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {qItem.qty} × {brfq.currency}
                                  </p>
                                  <div className="mt-1 flex justify-end">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                      {qItem.deliveryDays}d delivery
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
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Supplier Comments:</span> {quote.comments}
                          </p>
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
    </div>
  );
}