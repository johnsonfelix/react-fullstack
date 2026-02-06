"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { FaPaperPlane, FaSpinner, FaCheckCircle, FaSave, FaArrowLeft } from "react-icons/fa";

// Components
import SupplierTabOverview from "@/components/supplier/rfp-tabs/SupplierTabOverview";
import SupplierTabItems from "@/components/supplier/rfp-tabs/SupplierTabItems";
import SupplierTabQuestionnaire from "@/components/supplier/rfp-tabs/SupplierTabQuestionnaire";
import SupplierTabTerms from "@/components/supplier/rfp-tabs/SupplierTabTerms";
import SupplierTabAttachments from "@/components/supplier/rfp-tabs/SupplierTabAttachments";

interface RFP {
    id: string;
    title: string;
    status: string;
    requestType: string;
    items: any[];
    terms: any;
    questions?: any[];
    scopeOfWork?: any[];
    deliverables?: any;
    attachments?: any;
    quotes: any[];
    rfpResponses: any[];
    prValue: string | null;
    additionalFields: any;
    updatedAt: string;
}

export default function SupplierResponsePage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    const id = unwrappedParams.id;
    const router = useRouter();

    const [rfp, setRfp] = useState<RFP | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);


    // Form State
    const [quoteData, setQuoteData] = useState({
        validFor: "30 Days",
        currency: "USD",
        shipping: "Included",
        comments: ""
    });
    const [itemResponses, setItemResponses] = useState<Record<string, any>>({});
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

    useEffect(() => {
        const fetchRfp = async () => {
            try {
                const res = await fetch(`/api/supplier/rfp/${id}`);
                if (!res.ok) throw new Error("Failed to load RFP details");
                const data = await res.json();
                setRfp(data);

                // Initialize State
                initializeForm(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchRfp();
    }, [id]);

    const initializeForm = (data: RFP) => {
        // 1. Quote Items
        if (data.quotes && data.quotes.length > 0) {
            const q = data.quotes[0];
            setQuoteData({
                validFor: q.validFor || "30 Days",
                currency: q.currency || "USD",
                shipping: q.shipping || "Included",
                comments: q.comments || ""
            });

            const itemsMap: any = {};
            q.items.forEach((item: any) => {
                itemsMap[item.procurementItemId] = {
                    unitPrice: item.unitPrice,
                    qty: item.qty,
                    deliveryDays: item.deliveryDays,
                    supplierPartNo: item.supplierPartNo
                };
            });
            setItemResponses(itemsMap);
        } else {
            const initialItems: any = {};
            data.items.forEach((item: any) => {
                initialItems[item.id] = {
                    unitPrice: 0,
                    qty: item.quantity,
                    deliveryDays: "14 Days",
                    supplierPartNo: ""
                };
            });
            setItemResponses(initialItems);
        }

        // 2. Answers
        if (data.rfpResponses && data.rfpResponses.length > 0) {
            const ansMap: any = {};
            data.rfpResponses.forEach((resp: any) => {
                ansMap[resp.questionId] = resp.answer;
            });
            setAnswers(ansMap);
        }

        // 3. Attachments
        if (data.quotes && data.quotes.length > 0 && data.quotes[0].attachments) {
            const atts = Array.isArray(data.quotes[0].attachments) ? data.quotes[0].attachments : [];
            setUploadedFiles(atts);
        }
    };

    const validateMandatoryQuestions = () => {
        if (!rfp || !rfp.deliverables) return true;
        const sections: any[] = rfp.deliverables;
        let missing = [];

        for (const section of sections) {
            if (section.questions) {
                for (const q of section.questions) {
                    if (q.mandatory) {
                        const ans = answers[q.id];
                        if (!ans || !ans.value || (typeof ans.value === "string" && ans.value.trim() === "")) {
                            missing.push(q.text);
                        }
                    }
                }
            }
        }

        if (missing.length > 0) {
            alert(`Please answer the following mandatory questions before submitting:\n\n- ${missing.slice(0, 5).join("\n- ")}${missing.length > 5 ? "\n...and more" : ""}`);
            return false;
        }
        return true;
    };

    const handleSave = async (isSubmit = false) => {
        if (isSubmit && !validateMandatoryQuestions()) {
            return;
        }

        setSubmitting(true);
        try {
            const cleanPayload = {
                rfpId: id,
                quotes: itemResponses,
                answers: answers,
                attachments: uploadedFiles,
                status: isSubmit ? "SUBMITTED" : "DRAFT"
            };

            const res = await fetch("/api/supplier/response/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cleanPayload)
            });

            if (!res.ok) throw new Error("Failed to save response");

            if (isSubmit) {
                setSuccess(true);
            } else {
                alert("Draft saved successfully!");
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><FaSpinner className="animate-spin text-4xl text-blue-600" /></div>;
    if (error) return <div className="p-8 text-red-600 text-center">Error: {error}</div>;
    if (!rfp) return <div className="p-8 text-center">RFP Not Found</div>;

    if (success) {
        return (
            <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-xl shadow text-center border border-green-100">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 text-4xl">
                    <FaCheckCircle />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Response Submitted!</h2>
                <p className="text-gray-600 mb-8 text-lg">Thank you for your submission. The buyer will be notified and will review your response shortly.</p>
                <button
                    onClick={() => router.push("/supplier/dashboard")}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-slate-800">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-16 z-30 supports-[backdrop-filter]:bg-white/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all">
                            <FaArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight truncate max-w-xl tracking-tight">{rfp.title}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-100">{rfp.requestType}</span>
                                <span className="text-sm text-gray-500 font-medium tracking-wide">Ref: <span className="font-mono text-gray-700">{rfp.id.substring(0, 8)}</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden lg:block text-right pr-6 border-r border-gray-200">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Total Quote Value</div>
                            <div className="text-xl font-bold text-blue-600 font-mono tracking-tight">
                                {Object.values(itemResponses).reduce((sum: number, item: any) => sum + ((parseFloat(item.unitPrice) || 0) * (parseInt(item.qty) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-400 font-sans font-medium">USD</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleSave(false)}
                                disabled={submitting}
                                className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-semibold text-sm transition-all focus:ring-4 focus:ring-gray-100 shadow-sm"
                            >
                                <FaSave className="text-gray-400" /> Save Draft
                            </button>
                            <button
                                onClick={() => { if (confirm("Are you sure you want to submit? You may not be able to edit afterwards.")) handleSave(true); }}
                                disabled={submitting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all focus:ring-4 focus:ring-blue-100"
                            >
                                {submitting ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />} Submit Response
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Grid */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

                    {/* Navigation Sidebar */}
                    <aside className="hidden lg:block lg:col-span-3 sticky top-36">
                        <nav className="space-y-1">
                            {[
                                { id: 'overview', label: 'Overview', icon: '📝' },
                                { id: 'items', label: 'Line Items & Quote', icon: '📦' },
                                { id: 'questionnaire', label: 'Questionnaire', icon: '📋' },
                                { id: 'terms', label: 'Terms & Conditions', icon: '⚖️' },
                                { id: 'attachments', label: 'Attachments', icon: '📎' },
                            ].map((item) => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors group"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                >
                                    <span className="opacity-70 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0 filter text-lg">{item.icon}</span>
                                    {item.label}
                                </a>
                            ))}
                        </nav>

                        <div className="mt-8 bg-blue-50 rounded-xl p-5 border border-blue-100">
                            <h3 className="font-bold text-blue-800 mb-2 text-sm">Need Help?</h3>
                            <p className="text-xs text-blue-600 leading-relaxed mb-3">If you have technical issues, please contact our support team.</p>
                            <button className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline">Contact Support &rarr;</button>
                        </div>
                    </aside>

                    {/* Content Sections */}
                    <div className="lg:col-span-9 space-y-16 pb-20">

                        {/* Overview Section */}
                        <section id="overview" className="scroll-mt-28">
                            <SectionHeader title="Overview" subtitle="Key details about this request" />
                            <SupplierTabOverview data={rfp} />
                        </section>

                        {/* Line Items Section */}
                        <section id="items" className="scroll-mt-28">
                            <SectionHeader title="Line Items & Quote" subtitle="Please review items below and enter your unit price and lead time." />
                            <SupplierTabItems
                                items={rfp.items}
                                responses={itemResponses}
                                onResponseChange={(itemId, field, value) => {
                                    setItemResponses(prev => ({
                                        ...prev,
                                        [itemId]: { ...prev[itemId], [field]: value }
                                    }));
                                }}
                            />
                        </section>

                        {/* Questionnaire Section */}
                        <section id="questionnaire" className="scroll-mt-28">
                            <SectionHeader title="Questionnaire" subtitle="Please complete the required questions." />
                            <SupplierTabQuestionnaire
                                data={{ deliverables: rfp.deliverables || [] }}
                                answers={answers}
                                onAnswerChange={(qId, val) => {
                                    setAnswers(prev => ({
                                        ...prev,
                                        [qId]: val
                                    }));
                                }}
                            />
                        </section>

                        {/* Terms Section */}
                        <section id="terms" className="scroll-mt-28">
                            <SectionHeader title="Terms & Conditions" subtitle="Review the terms and conditions for this request." />
                            <SupplierTabTerms data={rfp} />
                        </section>

                        {/* Attachments Section */}
                        <section id="attachments" className="scroll-mt-28">
                            <SectionHeader title="Attachments" subtitle="Download buyer docs and upload your response files." />
                            <SupplierTabAttachments
                                data={rfp}
                                responses={uploadedFiles}
                                onUpload={async (file) => {
                                    const formData = new FormData();
                                    formData.append("file", file);
                                    try {
                                        // Optimistic UI update
                                        const tempId = Math.random().toString(36).substr(2, 9);
                                        const tempFile = { id: tempId, name: file.name, loading: true };
                                        setUploadedFiles(prev => [...prev, tempFile]);

                                        const res = await fetch("/api/upload", {
                                            method: "POST",
                                            body: formData
                                        });
                                        if (!res.ok) throw new Error("Upload failed");
                                        const data = await res.json();

                                        // Update with real data
                                        setUploadedFiles(prev => prev.map(f => f.id === tempId ? { ...data, id: data.url } : f)); // Use URL as ID or generate one
                                    } catch (err) {
                                        alert("Failed to upload file");
                                        setUploadedFiles(prev => prev.filter(f => f.name !== file.name)); // Remove failed
                                    }
                                }}
                                onRemove={(fileId) => {
                                    setUploadedFiles(prev => prev.filter(f => f.id !== fileId && f.url !== fileId));
                                }}
                            />
                        </section>

                    </div>
                </div>
            </main>
        </div>
    );
}

function SectionHeader({ title, subtitle }: { title: string, subtitle?: string }) {
    return (
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>}
            <div className="h-1 w-12 bg-blue-600 rounded-full mt-3 opacity-20"></div>
        </div>
    );
}
