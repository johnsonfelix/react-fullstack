
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaBoxOpen, FaCheckCircle, FaClock, FaSpinner, FaExclamationCircle, FaTimesCircle, FaQuestionCircle } from "react-icons/fa";
import Link from "next/link";

interface RFP {
    id: string;
    title: string;
    status: string;
    requestType: string;
    createdAt: string;
    updatedAt: string;
    prValue: string | null;
    additionalFields: any;
    hasResponded: boolean;
    responseDate: string | null;
    participationStatus: "PENDING" | "ACCEPTED" | "DECLINED";
}

export default function SupplierDashboard() {
    const [rfps, setRfps] = useState<RFP[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
    const router = useRouter();

    const fetchRfps = async () => {
        try {
            const res = await fetch("/api/supplier/dashboard", { cache: "no-store" });
            if (res.status === 401) {
                setError("Unauthorized. Please log in.");
                return;
            }
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to fetch RFPs");
            }
            const data = await res.json();
            setRfps(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRfps();
    }, []);

    const handleAcknowledge = async (rfpId: string, status: "ACCEPTED" | "DECLINED") => {
        if (!confirm(status === "ACCEPTED" ? "Confirm participation in this event?" : "Confirm declining this event?")) return;

        try {
            const res = await fetch("/api/supplier/acknowledge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rfpId, status })
            });

            if (!res.ok) throw new Error("Failed to update status");

            // Refresh list
            fetchRfps();
            setAcknowledgingId(null);
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 font-sans">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Supplier Portal</h1>
                    <p className="text-gray-500 mt-1">Manage your invitations and submit responses.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3 border border-red-200">
                    <FaExclamationCircle /> {error}
                </div>
            )}

            <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
                <table className="min-w-full bg-white">
                    <thead>
                        <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                            <th className="py-3 px-6">#</th>
                            <th className="py-3 px-6">Title</th>
                            <th className="py-3 px-6">Type</th>
                            <th className="py-3 px-6">Published Date</th>
                            <th className="py-3 px-6">Status</th>
                            <th className="py-3 px-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 text-sm">
                        {rfps.length > 0 ? (
                            rfps.map((rfp, index) => (
                                <tr key={rfp.id} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-6">{index + 1}</td>
                                    <td className="py-3 px-6 font-medium text-gray-900">
                                        {rfp.title}
                                    </td>
                                    <td className="py-3 px-6">
                                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100 uppercase">
                                            {rfp.requestType}
                                        </span>
                                    </td>
                                    <td className="py-3 px-6">
                                        {new Date(rfp.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-6">
                                        {rfp.hasResponded ? (
                                            <span className="flex items-center gap-1 text-green-600 font-medium">
                                                <FaCheckCircle /> Submitted
                                            </span>
                                        ) : rfp.participationStatus === "ACCEPTED" ? (
                                            <span className="flex items-center gap-1 text-blue-600 font-medium">
                                                <FaCheckCircle /> Accepted
                                            </span>
                                        ) : rfp.participationStatus === "DECLINED" ? (
                                            <span className="flex items-center gap-1 text-red-500 font-medium">
                                                <FaTimesCircle /> Declined
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-orange-600 font-medium animate-pulse">
                                                <FaQuestionCircle /> Action Required
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-6">
                                        {rfp.hasResponded ? (
                                            <button
                                                onClick={() => router.push(`/supplier/rfp/${rfp.id}`)}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                View Response
                                            </button>
                                        ) : rfp.participationStatus === "ACCEPTED" ? (
                                            <button
                                                onClick={() => router.push(`/supplier/rfp/${rfp.id}`)}
                                                className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 transition"
                                            >
                                                Respond Now
                                            </button>
                                        ) : rfp.participationStatus === "DECLINED" ? (
                                            <span className="text-gray-400">Changed your mind? <button onClick={() => handleAcknowledge(rfp.id, "ACCEPTED")} className="text-blue-600 hover:underline">Accept</button></span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {acknowledgingId === rfp.id ? (
                                                    <div className="flex gap-2 animate-fadeIn">
                                                        <span className="text-xs font-bold mr-1">Participate?</span>
                                                        <button
                                                            onClick={() => handleAcknowledge(rfp.id, "ACCEPTED")}
                                                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                                                        >
                                                            Yes
                                                        </button>
                                                        <button
                                                            onClick={() => handleAcknowledge(rfp.id, "DECLINED")}
                                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                                                        >
                                                            No
                                                        </button>
                                                        <button
                                                            onClick={() => setAcknowledgingId(null)}
                                                            className="text-gray-400 hover:text-gray-600 px-1"
                                                        >
                                                            x
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setAcknowledgingId(rfp.id)}
                                                        className="bg-gray-800 text-white px-4 py-1.5 rounded hover:bg-gray-900 transition text-sm shadow-sm"
                                                    >
                                                        Acknowledge
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <FaBoxOpen className="text-4xl text-gray-300 mb-2" />
                                        <p>No invitations found.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
