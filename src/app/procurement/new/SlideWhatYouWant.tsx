"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Package, MapPin, FileText, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  procurementDraft?: any;
  setProcurementDraft?: (d: any) => void;
  next?: (overrideIndex?: number) => void;
  SLIDES?: Record<string, number>;
};

export default function FuturisticProcurementBot({
  procurementDraft: parentDraft,
  setProcurementDraft,
  next,
  SLIDES,
}: Props) {
  const router = useRouter();

  // local messages UI
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hello! I'm your AI Procurement Assistant. Tell me what you need and I'll help you create a procurement request.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [procurementData, setProcurementData] = useState({
    description: "",
    requestType: "",
    category: "",
    address: "",
    items: [],
    scopeOfWork: "",
    redirectTarget: "",
  });
  const [stage, setStage] = useState<string>("initial");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const addMessage = (from: "bot" | "user", text: string) => {
    setMessages((prev) => [...prev, { from, text }]);
  };

  const persistDraft = (draft: any) => {
    setProcurementData(draft);
    try {
      if (typeof setProcurementDraft === "function") {
        setProcurementDraft(draft);
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("procurementDraft", JSON.stringify(draft));
      }
    } catch (e) {
      console.error("persistDraft error", e);
    }
  };

  const handleAIClassification = async (userInput) => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/request-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: userInput }),
      });

      if (!res.ok) {
        const text = await res.text();
        addMessage("bot", `⚠️ AI service error: ${text}. Please try again.`);
        setLoading(false);
        return;
      }

      const ai = await res.json();
      const requestType = (ai.requestType || ai.type || "").toString().toLowerCase();
      const category = (ai.category || ai.predictedCategory || "").toString();

      let redirectTarget = "/rfq";
      let nextStage = "address";

      if (requestType.includes("service") || requestType.includes("services")) {
        redirectTarget = "/sow";
      } else if (requestType.includes("rfp")) {
        redirectTarget = "/rfq";
      } else if (requestType.includes("goods") || requestType.includes("product") || requestType.includes("products")) {
        redirectTarget = "/rfq";
      }

      const updated = {
        ...procurementData,
        description: userInput,
        requestType,
        category,
        redirectTarget,
      };
      setProcurementData(updated);

      addMessage(
        "bot",
        `Perfect! I've classified this as a **${requestType}** request under the **${category}** category.`
      );

      setTimeout(() => {
        // Conditional wording based on type
        const isService = requestType.includes("service") || requestType.includes("services");
        const addressPrompt = isService
          ? "Now, where should this be performed? Please provide the address."
          : "Now, where should this be delivered? Please provide the address.";
        
        addMessage("bot", addressPrompt);
        setStage(nextStage);
        setLoading(false);
      }, 500);
    } catch (err) {
      addMessage("bot", `❌ Error: ${err.message || err}. Please try again.`);
      setLoading(false);
    }
  };

  const parseItem = (text: string) => {
    const match = text.match(/(\d+)\s+(.+?),?\s*(each|unit|piece|pieces|kg|meter|m)?$/i);
    if (match) {
      return {
        name: match[2].trim(),
        quantity: parseInt(match[1], 10),
        unit: (match[3] || "unit").toString(),
      };
    }
    return { name: text, quantity: 1, unit: "unit" };
  };

  const simulateAIResponse = async (userInput: string) => {
    if (stage === "initial") {
      await handleAIClassification(userInput);
      return;
    }

    if (stage === "address") {
      setLoading(true);
      const updated = { ...procurementData, address: userInput };
      persistDraft(updated);
      addMessage("bot", `Great! Address saved: ${userInput}`);

      setTimeout(() => {
        const rt = (updated.requestType || "").toLowerCase();
        if (rt === "service" || rt === "services" || rt === "rfp") {
          addMessage("bot", "Since this is a service/RFP, I'll take you to the Scope of Work screen next.");
          setStage("service");
          if (SLIDES && typeof next === "function") {
            const scopeIndex = SLIDES.SCOPE ?? 4;
            next(scopeIndex);
          } else if (typeof next === "function") {
            next();
          }
        } else {
          addMessage(
            "bot",
            "Now let's add the items you need. Please specify one item per line like: `10 Office Chairs` or type `done` when finished."
          );
          setStage("goods");
          if (SLIDES && typeof next === "function") {
            const goodsIndex = SLIDES.GOODS ?? SLIDES.ITEMS ?? 3;
            next(goodsIndex);
          } else if (typeof next === "function") {
            next();
          }
        }
        setLoading(false);
      }, 500);
      return;
    }

    if (stage === "goods") {
      setLoading(true);
      if (userInput.trim().toLowerCase() === "done") {
        addMessage("bot", "Items saved! Let me show you a summary of your procurement request.");
        setTimeout(() => {
          setStage("review");
          showReview();
          setLoading(false);
        }, 500);
      } else {
        const item = parseItem(userInput.trim());
        const updated = { ...procurementData, items: [...(procurementData.items || []), item] };
        persistDraft(updated);
        addMessage("bot", `Added: ${item.name} x${item.quantity} ${item.unit}`);
        setTimeout(() => {
          addMessage("bot", "Add another item or type 'done' to continue.");
          setLoading(false);
        }, 300);
      }
      return;
    }

    if (stage === "service") {
      setLoading(true);
      const updated = { ...procurementData, scopeOfWork: userInput };
      persistDraft(updated);
      addMessage("bot", "Scope of work saved! Let me show you a summary of your procurement request.");
      setTimeout(() => {
        setStage("review");
        showReview();
        setLoading(false);
      }, 500);
      return;
    }

    if (stage === "review") {
      const cmd = userInput.trim().toLowerCase();
      if (cmd === "continue") {
        addMessage("bot", "🚀 Redirecting you to the appropriate form...");
        setTimeout(() => {
          if (typeof setProcurementDraft === "function") setProcurementDraft(procurementData);
          try {
            sessionStorage.setItem("procurementDraft", JSON.stringify(procurementData));
          } catch (e) {
            console.error(e);
          }
          router.push("/buyer/events/create");
        }, 800);
      } else if (cmd === "restart") {
        setStage("initial");
        const fresh = { description: "", requestType: "", category: "", address: "", items: [], scopeOfWork: "" };
        persistDraft(fresh);
        addMessage("bot", "Let's start over! What do you need to procure?");
      } else {
        addMessage("bot", "I didn't understand that. Type `continue` to proceed or `restart` to start over.");
      }
    }
  };

  const showReview = () => {
    const draft = procurementData;
    const itemsText =
      (draft.items && draft.items.length > 0)
        ? draft.items.map((it: any) => `• ${it.name} - ${it.quantity} ${it.unit}`).join("\n")
        : "";

    const summary = `
📋 **Procurement Request Summary**

**Type:** ${draft.requestType || "N/A"}
**Category:** ${draft.category || "N/A"}
**Description:** ${draft.description || "N/A"}
**Address:** ${draft.address || "N/A"}

${draft.requestType?.toLowerCase() === "service" || draft.requestType?.toLowerCase() === "services"
        ? `**Scope of Work:**\n${draft.scopeOfWork || "N/A"}`
        : `**Items:**\n${itemsText || "No items added."}`
      }

Type 'continue' to proceed or 'restart' to begin again.
    `.trim();

    addMessage("bot", summary);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    addMessage("user", trimmed);
    setInput("");
    await simulateAIResponse(trimmed);
  };

  const getStageIcon = () => {
    switch (stage) {
      case "initial":
        return <Sparkles className="w-5 h-5" />;
      case "address":
        return <MapPin className="w-5 h-5" />;
      case "goods":
        return <Package className="w-5 h-5" />;
      case "service":
        return <FileText className="w-5 h-5" />;
      case "review":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="h-[80vh] w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-4xl h-full max-h-[95vh] bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-500/20 flex flex-col overflow-hidden">
        
        {/* Header - Fixed height */}
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center animate-pulse shadow-lg">
            {getStageIcon()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">AI Procurement Assistant</h1>
            <p className="text-purple-200 text-sm mt-1">
              Stage: <span className="font-semibold">{stage.charAt(0).toUpperCase() + stage.slice(1)}</span>
            </p>
          </div>
        </div>

        {/* Messages - Flexible scrollable area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-lg transition-all hover:scale-[1.02] ${
                  msg.from === "user"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white ml-auto"
                    : "bg-slate-700/50 backdrop-blur-md text-gray-100 border border-purple-500/20"
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.text.split("**").map((part, i) =>
                    i % 2 === 0 ? (
                      part
                    ) : (
                      <strong key={i} className="font-semibold text-purple-300">
                        {part}
                      </strong>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-slate-700/50 backdrop-blur-md rounded-2xl p-4 border border-purple-500/20 shadow-lg">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - Fixed height */}
        <div className="flex-shrink-0 p-6 bg-slate-800/80 backdrop-blur-md border-t border-purple-500/20 shadow-lg">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 bg-slate-700/50 backdrop-blur-md border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transform hover:scale-105"
            >
              <Send className="w-4 h-4" />
              <span className="font-medium">Send</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
