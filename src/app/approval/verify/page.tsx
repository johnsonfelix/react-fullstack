
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";

function ApprovalVerifyContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const actionParam = searchParams.get("action"); // 'reject' if clicked from reject link

    const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
    const [message, setMessage] = useState("");
    const [rfpDetails, setRfpDetails] = useState<any>(null);

    // Decode token strictly for display (server verifies it)
    useEffect(() => {
        if (token) {
            try {
                const decoded = JSON.parse(atob(token));
                setRfpDetails(decoded);
            } catch (e) {
                console.error("Invalid token format");
            }
        }
    }, [token]);

    const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
        setStatus("loading");
        try {
            const res = await fetch("/api/approval/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, decision })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus("success");
                setMessage(decision === "APPROVED" ? "Successfully approved!" : "Request rejected.");
            } else {
                setStatus("error");
                setMessage(data.error || "Something went wrong.");
            }
        } catch (error) {
            setStatus("error");
            setMessage("Network error. Please try again.");
        }
    };

    if (!token) {
        return <div className="p-10 text-center text-red-500">Invalid or missing token.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center space-y-6">

                {status === "loading" && (
                    <div className="py-10">
                        <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto" />
                        <p className="mt-4 text-gray-500">Processing your decision...</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="py-6 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaCheckCircle className="text-3xl" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Done!</h2>
                        <p className="text-gray-600 mt-2">{message}</p>
                    </div>
                )}

                {status === "error" && (
                    <div className="py-6 animate-in shake duration-300">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaTimesCircle className="text-3xl" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Error</h2>
                        <p className="text-red-600 mt-2">{message}</p>
                    </div>
                )}

                {status === "idle" && (
                    <div>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">Approval Request</h1>
                            <p className="text-gray-500 mt-2">
                                Please review the request for <strong>RFP ID: {rfpDetails?.rfpId?.substring(0, 8)}...</strong>
                            </p>
                            {/* Ideally we would fetch full RFP details here to show summary */}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleDecision("REJECTED")}
                                className="px-6 py-3 rounded-xl border border-red-200 text-red-700 font-medium hover:bg-red-50 transition"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => handleDecision("APPROVED")}
                                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition"
                            >
                                Approve Request
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ApprovalVerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl">
                    <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto" />
                </div>
            </div>
        }>
            <ApprovalVerifyContent />
        </Suspense>
    );
}
