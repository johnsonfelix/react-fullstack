"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SuccessClient() {
  const params = useSearchParams();
  const router = useRouter();

  const ref = params.get("ref") ?? "";
  const submittedAtRaw = params.get("submittedAt") ?? "";

  const [copied, setCopied] = useState(false);

  // Parse submittedAt safely
  const submittedAt = useMemo(() => {
    try {
      const decoded = decodeURIComponent(submittedAtRaw);
      const d = new Date(decoded);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }, [submittedAtRaw]);

  const formatDateTime = (date) => {
    if (!date) return "Unknown";
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    } catch {
      return date.toISOString();
    }
  };

  const timeAgo = (date) => {
    if (!date) return "";
    const diff = Date.now() - date.getTime();
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    const divisions = [
      { amount: 1000, name: "second" },
      { amount: 60, name: "minute" },
      { amount: 60, name: "hour" },
      { amount: 24, name: "day" },
      { amount: 7, name: "week" },
      { amount: 4.34524, name: "month" },
      { amount: 12, name: "year" },
    ];

    let duration = Math.floor(diff / 1000);
    for (let i = 0; i <= divisions.length; i++) {
      const division = divisions[i];
      if (!division || Math.abs(duration) < division.amount) {
        const name = division ? division.name : "year";
        return rtf.format(-Math.floor(duration), name as Intl.RelativeTimeFormatUnit);

      }
      duration = duration / division.amount;
    }
    return "";
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
      alert("Unable to copy reference.");
    }
  };

  const goHome = () => router.push("/");
  const viewSubmission = () => router.push(`/supplier-registration/track?ref=${encodeURIComponent(ref)}`);

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <section
        aria-labelledby="success-title"
        className="w-full max-w-3xl bg-white/90 backdrop-blur rounded-3xl shadow-xl ring-1 ring-black/5 p-8 md:p-12"
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <span className="shrink-0 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
            {/* Check icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-8 w-8 text-emerald-600"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10.28 15.22a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l2.47 2.47 6.47-6.47a.75.75 0 1 1 1.06 1.06l-7 7z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <div className="flex-1">
            <h1 id="success-title" className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
              Registration submitted successfully
            </h1>
            <p className="mt-1 text-gray-600">
              Thanks for sharing your details. We’ll review your submission and notify you over email.
            </p>
          </div>
        </div>

        {/* Reference & submitted info */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-700">Reference ID</h2>
            <div className="mt-2 flex items-center gap-3">
              <code
                className="inline-flex max-w-full overflow-x-auto rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-200"
                aria-label="Reference ID"
              >
                {ref || "—"}
              </code>
              <button
                type="button"
                onClick={copyRef}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-live="polite"
              >
                {/* Copy icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                  <rect x="9" y="9" width="10" height="10" rx="2"></rect>
                  <rect x="5" y="5" width="10" height="10" rx="2"></rect>
                </svg>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">Keep this for your records — you’ll need it to track status.</p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-700">Submitted</h2>
            <div className="mt-2 text-sm text-gray-900">
              {submittedAt ? (
                <>
                  <p>{formatDateTime(submittedAt)}</p>
                  <p className="text-xs text-gray-500 mt-1">{timeAgo(submittedAt)}</p>
                </>
              ) : (
                <p>Unknown</p>
              )}
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="mt-8 rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700">What’s next?</h2>
          <ol className="mt-3 grid gap-3">
            {[{
              title: "Verification",
              desc: "Our team validates company and compliance details.",
            },{
              title: "Account setup",
              desc: "We’ll create your supplier account and send login instructions.",
            },{
              title: "Go live",
              desc: "Access the portal to manage documents, RFQs, and notifications.",
            }].map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-600">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Actions */}
        {/* <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={viewSubmission}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-[0.99]"
          >

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Track status
          </button>

          <button
            type="button"
            onClick={goHome}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 active:scale-[0.99]"
          >

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M19 10.5V20a1 1 0 0 1-1 1h-4v-6H10v6H6a1 1 0 0 1-1-1v-9.5" />
            </svg>
            Go to homepage
          </button>
        </div> */}

        {/* Subtle confetti accent */}
        <div aria-hidden className="pointer-events-none select-none">
          <div className="absolute -z-10 inset-0 overflow-hidden">
            <div className="absolute right-[-6rem] top-[-6rem] h-48 w-48 rotate-12 rounded-3xl bg-emerald-200/40 blur-2xl"></div>
            <div className="absolute left-[-6rem] bottom-[-6rem] h-48 w-48 -rotate-12 rounded-3xl bg-indigo-200/40 blur-2xl"></div>
          </div>
        </div>
      </section>
    </main>
  );
}
