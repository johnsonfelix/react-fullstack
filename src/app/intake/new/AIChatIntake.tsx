"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, CheckCircle, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils"; // Assuming a utils file exists for tailwind-merge, if not I'll use template literals or check for it.

// Fallback for cn if not available, but usually it is in these projects. 
// I'll assume standard shadcn/ui structure or similar based on package.json having clsx/tailwind-merge.

type Message = {
    role: "user" | "assistant";
    content: string;
};

type ProcurementDraft = {
    description?: string;
    requestType?: "goods" | "service";
    category?: string;
    address?: string;
    items?: any[];
    scopeOfWork?: string;
    [key: string]: any;
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
                setDraft(data.updatedDraft);
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
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
                        <DraftField label="Address" value={draft.address} />

                        {draft.items && draft.items.length > 0 && (
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Items ({draft.items.length})
                                </label>
                                <ul className="space-y-2">
                                    {draft.items.map((item: any, i: number) => (
                                        <li key={i} className="text-sm text-gray-700 flex justify-between border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                                            <span>{item.name || "Unnamed Item"}</span>
                                            <span className="font-medium text-gray-900">x{item.quantity || 1}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {isComplete && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full mt-6 py-3 bg-green-600 text-white rounded-xl font-medium shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                                onClick={() => alert("Proceeding to submission... (Mock Action)")}
                            >
                                <CheckCircle className="w-5 h-5" />
                                Submit Request
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
