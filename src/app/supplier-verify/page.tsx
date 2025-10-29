// app/supplier-registration/verify/page.tsx
import React, { Suspense } from "react";
import SupplierVerifyClient from "./SupplierVerifyClient";

export default function Page() {
  return (
    <main>
      <h1 className="sr-only">Supplier Verification</h1>

      <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6">Loading…</div>}>
        <SupplierVerifyClient />
      </Suspense>
    </main>
  );
}
