"use client";

import { useState, useEffect } from "react";

export default function SlideAddress({ procurementDraft, setProcurementDraft, next, prev, SLIDES }: any) {
  const [address, setAddress] = useState(procurementDraft.address || "");

  useEffect(() => {
    setAddress(procurementDraft.address || "");
  }, [procurementDraft.address]);

  const handleNext = () => {
    if (!address.trim()) {
      alert("Please provide a delivery / service address.");
      return;
    }

    setProcurementDraft((d: any) => ({ ...d, address }));

    const rt = (procurementDraft.requestType || "").toString().toLowerCase();

    if (rt === "service" || rt === "services") {
      next(SLIDES.SCOPE);
      return;
    }

    if (rt === "goods" || rt === "product" || rt === "products") {
      next(SLIDES.GOODS);
      return;
    }

    // fallback default to goods flow
    next(SLIDES.GOODS);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">📍 Delivery / Service address</h2>
      <textarea
        className="w-full p-3 border rounded-lg min-h-[100px]"
        placeholder="Address, site details, building, floor, special instructions..."
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={prev} className="py-2 px-4 border rounded">
          Back
        </button>
        <button onClick={handleNext} className="py-2 px-4 bg-blue-600 text-white rounded">
          Continue
        </button>
      </div>
    </div>
  );
}
