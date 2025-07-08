"use client";

import { useState } from "react";

export default function SlideWhatYouWant({
  procurementDraft,
  setProcurementDraft,
  next,
}: any) {
  const [input, setInput] = useState("");

  const handleNext = async () => {
    if (!input.trim()) {
      alert("Please describe what you want to procure.");
      return;
    }

    const res = await fetch("/api/ai/request-type", {
      method: "POST",
      body: JSON.stringify({ input }),
    });
    const ai = await res.json();
    setProcurementDraft({
      ...procurementDraft,
      description: input,
      requestType: ai.requestType,
      category: ai.category,
    });
    next();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-800">
        🛠️ What would you like to procure?
      </h2>
      <p className="text-gray-600">
        Describe your procurement request in a sentence or two, and our AI will
        help categorize it automatically.
      </p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="E.g., I need to procure 5 laptops with 16GB RAM..."
        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-h-[120px]"
      />

      <button
        onClick={handleNext}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Continue
      </button>
    </div>
  );
}
