"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, CheckCircle, FileText, Calendar, DollarSign, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import CatalogSuggestions from "@/components/intake/CatalogSuggestions";
import { useRouter } from "next/navigation";

type Message = {
    role: "user" | "assistant";
    content: string;
};

type ProcurementDraft = {
    description?: string;
    requestType?: "goods" | "service";
    category?: string;
    address?: string;
    value?: string;
    needByDate?: string;
    items?: any[];
    scopeOfWork?: string;
    [key: string]: any;
};

type Location = {
    id: string;
    name: string;
    address: string;
};

export default function AIChatIntake() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hello! I'm your AI Procurement Assistant. I can help you create a new request. Please tell me what you need to buy or what service you require.",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [draft, setDraft] = useState<ProcurementDraft>({});
    const [isComplete, setIsComplete] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [suggestedItems, setSuggestedItems] = useState<any[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch("/api/locations")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setLocations(data);
            })
            .catch(err => console.error("Failed to fetch locations", err));
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/ai/intake-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    currentDraft: draft,
                }),
            });

            if (!res.ok) throw new Error("Failed to fetch AI response");

            const data = await res.json();

            if (data.updatedDraft) {
                setDraft(prev => ({ ...prev, ...data.updatedDraft }));
            }

            const aiMessage: Message = { role: "assistant", content: data.response };
            setMessages((prev) => [...prev, aiMessage]);

            if (data.isComplete) {
                setIsComplete(true);
            }
        } catch (error) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Auto-search catalog when draft updates items or description
    useEffect(() => {
        const query = draft.description || (draft.items?.[0]?.name);
        if (query && query.length > 3) {
            const timeoutId = setTimeout(async () => {
                try {
                    const res = await fetch(`/api/catalog/search?query=${encodeURIComponent(query)}`);
                    if (res.ok) {
                        const data = await res.json();
                        setSuggestedItems(data.items || []);
                    }
                } catch (e) {
                    console.error("Catalog search failed", e);
                }
            }, 1000); // Debounce
            return () => clearTimeout(timeoutId);
        }
    }, [draft.description, draft.items]);

    const handleSelectCatalogItem = (item: any) => {
        // Add item to draft
        const newItem = {
            name: item.description,
            quantity: 1,
            unitPrice: item.price,
            uom: item.uom?.name,
            currency: item.currency?.name,
            supplier: item.supplier?.companyName,
            catalogItemId: item.id,
            image: item.imageUrl,
            price: item.price // Store explicit price for display
        };

        const currentItems = draft.items || [];

        // Check for duplicates
        const existingItemIndex = currentItems.findIndex(i => i.name === newItem.name);
        if (existingItemIndex >= 0) {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `"${newItem.name}" is already in your list. You can update the quantity in the draft panel.`
            }]);
            return;
        }

        setDraft(prev => ({
            ...prev,
            category: (prev.category && prev.category !== "Pending...") ? prev.category : (item.category?.name || "Pending..."),
            items: [...currentItems, newItem]
        }));

        // Add system message
        setMessages(prev => [...prev, {
            role: "assistant",
            content: `I've added "${item.description}" from ${item.supplier?.companyName} to your list.`
        }]);
    };

    const updateItemQuantity = (index: number, quantity: number) => {
        const newItems = [...(draft.items || [])];
        if (quantity <= 0) {
            // Optional: remove item if quantity is 0, or just keep it at 1
            newItems.splice(index, 1);
        } else {
            newItems[index] = { ...newItems[index], quantity };
        }
        setDraft(prev => ({ ...prev, items: newItems }));
    };



    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const updateDraftField = (field: keyof ProcurementDraft, value: string) => {
        setDraft(prev => ({ ...prev, [field]: value }));
    };

    const router = useRouter();

    const handleIntakeSubmit = async () => {
        if (!draft.needByDate) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Please provide a "Need By Date" before submitting.' }]);
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draft),
            });

            if (!res.ok) throw new Error('Failed to submit request');

            // Clear draft and show success
            setDraft({});
            setMessages(prev => [...prev, { role: 'assistant', content: 'Your request has been submitted successfully! Redirecting you to the Requests page...' }]);
            setIsComplete(false);

            // Redirect to requests page
            router.refresh();
            router.push('/requests');

        } catch (error) {
            console.error('Submission error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to submit request. Please try again.' }]);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-[85vh] max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex items-center justify-between shadow-md z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">AI Intake Assistant</h1>
                        <p className="text-blue-100 text-sm">Describe your needs, I'll handle the rest.</p>
                    </div>
                </div>
                {isComplete && (
                    <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-400/30 backdrop-blur-md">
                        <CheckCircle className="w-5 h-5 text-green-300" />
                        <span className="font-medium text-green-100">Intake Complete</span>
                    </div>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Chat Area */}
                <div className="flex-1 flex flex-col relative bg-gray-50/50">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                        <AnimatePresence initial={false}>
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${msg.role === "user"
                                            ? "bg-blue-600 text-white rounded-br-none"
                                            : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {msg.role === "assistant" && <Bot className="w-5 h-5 mt-1 text-blue-600 shrink-0" />}
                                            <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                            {msg.role === "user" && <User className="w-5 h-5 mt-1 text-blue-200 shrink-0" />}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex justify-start"
                            >
                                <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm flex items-center gap-3">
                                    <Bot className="w-5 h-5 text-blue-600" />
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Catalog Suggestions Area */}
                    <AnimatePresence>
                        {suggestedItems.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-white border-t border-gray-100 z-10"
                            >
                                <CatalogSuggestions items={suggestedItems} onSelect={handleSelectCatalogItem} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your request here..."
                                className="flex-1 p-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none min-h-[60px] max-h-[120px] shadow-inner text-gray-800 placeholder:text-gray-400"
                                disabled={loading || isComplete}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading || isComplete}
                                className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-2">
                            AI can make mistakes. Please review the details before submitting.
                        </p>
                    </div>
                </div>

                {/* Live Draft Panel (Desktop) */}
                <div className="hidden lg:block w-80 bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-6 text-gray-800">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold">Live Draft</h2>
                    </div>

                    <div className="space-y-4">
                        <DraftField label="Description" value={draft.description} />
                        <DraftField label="Type" value={draft.requestType} />
                        <DraftField label="Category" value={draft.category} />

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow-md">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Address
                            </label>
                            <select
                                className="w-full text-sm p-1 border rounded bg-gray-50 focus:ring-1 focus:ring-blue-500"
                                value={draft.address || ""}
                                onChange={(e) => updateDraftField('address', e.target.value)}
                            >
                                <option value="">Select Location</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow-md">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
                                Est. Value
                            </label>
                            <input
                                type="text"
                                className="w-full text-sm p-1 border rounded bg-gray-50 focus:ring-1 focus:ring-blue-500"
                                placeholder="0.00"
                                value={draft.value || ""}
                                onChange={(e) => updateDraftField('value', e.target.value)}
                            />
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow-md">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Need By Date
                            </label>
                            <input
                                type="date"
                                className="w-full text-sm p-1 border rounded bg-gray-50 focus:ring-1 focus:ring-blue-500"
                                value={draft.needByDate || ""}
                                onChange={(e) => updateDraftField('needByDate', e.target.value)}
                            />
                        </div>

                        {draft.items && draft.items.length > 0 && (
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Items ({draft.items.length})
                                </label>
                                <ul className="space-y-2">

                                    {draft.items.map((item: any, i: number) => (
                                        <li key={i} className="text-sm text-gray-700 flex justify-between items-center border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                                            <span className="flex-1 truncate pr-2">{item.name || "Unnamed Item"}</span>
                                            <div className="flex items-center gap-1 bg-gray-100 rounded px-1">
                                                <button
                                                    className="w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
                                                    onClick={() => updateItemQuantity(i, (item.quantity || 1) - 1)}
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    className="w-8 text-center bg-transparent text-xs font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={item.quantity || 1}
                                                    onChange={(e) => updateItemQuantity(i, parseInt(e.target.value) || 0)}
                                                />
                                                <button
                                                    className="w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
                                                    onClick={() => updateItemQuantity(i, (item.quantity || 1) + 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {isComplete && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full mt-6 py-3 bg-green-600 text-white rounded-xl font-medium shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleIntakeSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DraftField({ label, value }: { label: string; value?: string }) {
    return (
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                {label}
            </label>
            <div className={`text-sm ${value ? "text-gray-800 font-medium" : "text-gray-400 italic"}`}>
                {value || "Pending..."}
            </div>
        </div>
    );
}
