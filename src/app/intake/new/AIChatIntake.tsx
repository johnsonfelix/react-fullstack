"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, CheckCircle, FileText, Calendar, DollarSign, MapPin, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import CatalogSuggestions from "@/components/intake/CatalogSuggestions";
import { useRouter } from "next/navigation";

type Message = {
    role: "user" | "assistant";
    content: string;
    suggestions?: any[];
    hiddenContent?: string;
    interactionMode?: 'options';
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
    const [shownQueries, setShownQueries] = useState<Set<string>>(new Set());
    const [isSelectionDone, setIsSelectionDone] = useState(false);

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
        const timeoutId = setTimeout(() => {
            scrollToBottom();
        }, 100); // Small delay to allow for rendering updates
        return () => clearTimeout(timeoutId);
    }, [messages, loading]); // Added loading to dependency to scroll when loading indicator appears/disappears

    const generateAIResponse = async (currentMessages: Message[]) => {
        setLoading(true);

        try {
            const res = await fetch("/api/ai/intake-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: currentMessages,
                    currentDraft: draft,
                }),
            });

            if (!res.ok) throw new Error("Failed to fetch AI response");

            const data = await res.json();

            if (data.updatedDraft) {
                setDraft(prev => ({ ...prev, ...data.updatedDraft }));
            }

            const aiMessage: Message = { role: "assistant", content: data.response };

            // Check if user just proceeded - if so, forcefully suppress new suggestions to prevent loops
            const lastUserMsg = currentMessages[currentMessages.length - 1];
            const isProceedAction = lastUserMsg?.role === 'user' && lastUserMsg?.content === 'Proceed with selection';

            // If AI provided specific search keywords, use them (UNLESS user just proceeded or we are done with selection)
            if (data.searchKeywords && !isProceedAction && !isSelectionDone) {
                const normalizedKeyword = data.searchKeywords.toLowerCase().trim();
                console.log("AI suggested search keywords:", data.searchKeywords);

                // Smart Check: If we already have items that match this keyword, DON'T search again.
                // This assumes the user is asking for more details about the *existing* item, not a new one.
                const currentItems = data.updatedDraft?.items || draft.items || [];
                const hasMatchingItem = currentItems.some((item: any) =>
                    item.name?.toLowerCase().includes(normalizedKeyword)
                );

                if (hasMatchingItem) {
                    console.log(`Keyword "${normalizedKeyword}" matches existing item. Suppressing search to avoid loops.`);
                } else if (!shownQueries.has(normalizedKeyword)) {
                    // Trigger an immediate search with these keywords
                    try {
                        const searchRes = await fetch(`/api/catalog/search?query=${encodeURIComponent(data.searchKeywords)}`);
                        if (searchRes.ok) {
                            const searchData = await searchRes.json();
                            if (searchData.items && searchData.items.length > 0) {

                                // Calculate current items based on draft and any updates from this response
                                // const currentItems = data.updatedDraft?.items || draft.items || []; // Already defined above
                                const existingIds = new Set(currentItems.map((i: any) => i.catalogItemId || i.id));

                                const filteredSuggestions = searchData.items.filter((item: any) => !existingIds.has(item.id));

                                if (filteredSuggestions.length > 0) {
                                    aiMessage.suggestions = filteredSuggestions;
                                    // Hide the AI text content and show suggestions + options
                                    aiMessage.hiddenContent = aiMessage.content;
                                    aiMessage.content = ""; // Clear visible content
                                    aiMessage.interactionMode = 'options';

                                    setShownQueries(prev => {
                                        const next = new Set(prev);
                                        next.add(normalizedKeyword);
                                        return next;
                                    });
                                } else {
                                    console.log("Skipping suggestions as all items are already in draft.");
                                }
                            }
                        }
                    } catch (e) {
                        console.error("AI keyword search failed", e);
                    }
                } else {
                    console.log("Skipping duplicate suggestion for keyword:", normalizedKeyword);
                }
            }

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

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        // Reset selection done state if user types manually (starting new context?)
        setIsSelectionDone(false);

        const userMessage: Message = { role: "user", content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");

        await generateAIResponse(newMessages);
    };

    // Auto-search catalog when draft updates items or description
    useEffect(() => {
        if (loading) return; // Don't auto-search if AI is currently processing (it handles its own search)

        // STRICT BLOCK: If selection is done, DO NOT SEARCH via effect
        if (isSelectionDone) return;

        // STRICT BLOCK: If we already have items, assume the "discovery" phase is over. 
        // Only AI-driven specific searches allowed from now on.
        if (draft.items && draft.items.length > 0) return;

        // Extract keywords for better search
        // remove draft.items check to avoid loop (searching for item we just added)
        let query = draft.description || "";

        // Simple heuristic: if query is long, take the first 3 words or try to clean it
        if (query.length > 20) {
            query = query.split(' ').slice(0, 3).join(' ');
        }

        const normalizedQuery = query.toLowerCase().trim();

        if (query && query.length > 3 && !shownQueries.has(normalizedQuery)) {
            const timeoutId = setTimeout(async () => {
                try {
                    // Check again inside timeout in case it changed
                    if (shownQueries.has(normalizedQuery)) return;
                    if (isSelectionDone) return; // Check again inside timeout

                    console.log("Searching catalog for:", query);
                    const res = await fetch(`/api/catalog/search?query=${encodeURIComponent(query)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.items && data.items.length > 0) {

                            // Filter out items that are already in the draft
                            const existingIds = new Set(draft.items?.map(i => i.catalogItemId || i.id) || []);
                            const filteredItems = data.items.filter((item: any) => !existingIds.has(item.id));

                            if (filteredItems.length === 0) {
                                console.log("All found items are already in draft, skipping suggestions.");
                                return;
                            }

                            setShownQueries(prev => {
                                const next = new Set(prev);
                                next.add(normalizedQuery);
                                return next;
                            });

                            // Check if the last message already has suggestions to avoid duplicate spam
                            setMessages(prev => {
                                const lastMsg = prev[prev.length - 1];

                                // if last message already has suggestions, don't just append blindly? 
                                // But maybe the user wants options.

                                return [...prev, {
                                    role: 'assistant',
                                    content: '',
                                    suggestions: filteredItems
                                }];
                            });
                        }
                    }
                } catch (e) {
                    console.error("Catalog search failed", e);
                }
            }, 1000); // Debounce
            return () => clearTimeout(timeoutId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft.description, draft.items, isSelectionDone]);

    const handleInteraction = (index: number, action: 'proceed' | 'manual') => {
        let updatedMessages = [...messages];

        // Update the target message
        updatedMessages[index] = {
            ...updatedMessages[index],
            content: updatedMessages[index].hiddenContent || updatedMessages[index].content,
            interactionMode: undefined,
            suggestions: action === 'manual' ? undefined : updatedMessages[index].suggestions
        };

        if (action === 'proceed') {
            setIsSelectionDone(true); // MARK SELECTION AS DONE
            const userMsg: Message = { role: 'user', content: 'Proceed with selection' };
            updatedMessages.push(userMsg);
            setMessages(updatedMessages);
            generateAIResponse(updatedMessages);
        } else {
            setMessages(updatedMessages);
        }
    };

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
        <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] w-full bg-white overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10 h-16 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">AI Intake Assistant</h1>
                        <p className="text-gray-500 text-xs mt-0.5">Describe your needs, I'll handle the rest.</p>
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
                {/* Chat Area */}
                <div className="flex-1 flex flex-col relative bg-gray-50">
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <AnimatePresence initial={false}>
                                {messages.map((msg, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                                    >
                                        {msg.content && (
                                            <div
                                                className={`max-w-[85%] p-4 rounded-2xl shadow-sm mb-2 ${msg.role === "user"
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
                                        )}

                                        {msg.suggestions && msg.suggestions.length > 0 && (
                                            <div className="w-full max-w-full overflow-hidden mb-4 pl-2">
                                                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                                                    <Package className="w-3 h-3" /> Suggested Items
                                                </div>
                                                <CatalogSuggestions items={msg.suggestions} onSelect={handleSelectCatalogItem} />

                                                {msg.interactionMode === 'options' && (
                                                    <div className="mt-3 flex justify-center gap-3">
                                                        {(() => {
                                                            const hasSelectedSuggestion = msg.suggestions?.some((s: any) =>
                                                                draft.items?.some((i: any) => i.catalogItemId === s.id)
                                                            );

                                                            return (
                                                                <button
                                                                    onClick={() => handleInteraction(idx, 'proceed')}
                                                                    disabled={!hasSelectedSuggestion}
                                                                    title={!hasSelectedSuggestion ? "Please select an item first" : ""}
                                                                    className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors shadow-sm ${hasSelectedSuggestion
                                                                            ? "bg-blue-600 hover:bg-blue-700"
                                                                            : "bg-gray-400 cursor-not-allowed opacity-70"
                                                                        }`}
                                                                >
                                                                    Proceed with Selection
                                                                </button>
                                                            );
                                                        })()}
                                                        <button
                                                            onClick={() => handleInteraction(idx, 'manual')}
                                                            className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
                                                        >
                                                            Enter Manually
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
                    </div>



                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-200 z-10">
                        <div className="max-w-3xl mx-auto">
                            <div className="relative flex items-end gap-2">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type your request here..."
                                    className="flex-1 p-4 pr-12 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none min-h-[56px] max-h-[120px] shadow-sm text-gray-800 placeholder:text-gray-400 text-sm leading-relaxed"
                                    disabled={loading || isComplete}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading || isComplete}
                                    className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-center text-[10px] text-gray-400 mt-2">
                                AI can make mistakes. Please review the details before submitting.
                            </p>
                        </div>
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
        </div >
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
