"use client";
import React from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SuccessClient() {
  const params = useSearchParams();
  const router = useRouter();
  const ref = params.get("ref") ?? "";
  const submittedAt = params.get("submittedAt") ?? "";

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(ref);
      alert("Reference copied to clipboard");
    } catch (err) {
      console.error("Copy failed", err);
      alert("Unable to copy reference.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div style={{ maxWidth: 760 }} className="bg-white rounded-2xl shadow-lg p-10 text-center">
        {/* ...same markup as before... */}
        <h1 className="text-3xl font-semibold mb-3">Registration Submitted</h1>
        {/* rest omitted for brevity */}
      </div>
    </div>
  );
}
