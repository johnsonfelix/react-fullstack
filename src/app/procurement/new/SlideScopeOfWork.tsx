"use client";

import { useState } from "react";

interface Deliverable {
  title: string;
  description: string;
  userInstruction: string;
}

interface SlideScopeOfWorkProps {
  procurementDraft: any;
  setProcurementDraft: (draft: any) => void;
  next: () => void;
  prev: () => void;
}

export default function SlideScopeOfWork({
  procurementDraft,
  setProcurementDraft,
  next,
  prev,
}: SlideScopeOfWorkProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>(
    procurementDraft.scopeOfWork || [{ title: "", description: "", userInstruction: "" }]
  );

  const addDeliverable = () => {
    const updated = [...deliverables, { title: "", description: "", userInstruction: "" }];
    setDeliverables(updated);
    setProcurementDraft({ ...procurementDraft, scopeOfWork: updated });
  };

  const updateDeliverable = (index: number, key: keyof Deliverable, value: string) => {
    const updated = deliverables.map((d, i) =>
      i === index ? { ...d, [key]: value } : d
    );
    setDeliverables(updated);
    setProcurementDraft({ ...procurementDraft, scopeOfWork: updated });
  };

  const handleGenerate = async (index: number) => {
    const deliverable = deliverables[index];
    if (!deliverable.userInstruction.trim()) {
      alert("Please enter an instruction to improve the description.");
      return;
    }
    try {
      const res = await fetch("/api/ai/sow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: deliverable.description,
          instruction: deliverable.userInstruction,
        }),
      });
      const data = await res.json();
      if (data.addition) {
        const newDescription = deliverable.description.trim()
          ? deliverable.description.trim() + "\n\n" + data.addition.trim()
          : data.addition.trim();
        updateDeliverable(index, "description", newDescription);
      } else {
        alert("AI did not return any improvement.");
      }
    } catch (error) {
      console.error("Error improving SOW:", error);
      alert("Failed to improve the description.");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">🛠️ Scope of Work</h2>
      <p className="text-gray-600">Define clear deliverables for your procurement.</p>

      {deliverables.map((deliverable, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg p-4 space-y-2 bg-gray-50"
        >
          <input
            type="text"
            placeholder="Deliverable Title"
            value={deliverable.title}
            onChange={(e) => updateDeliverable(index, "title", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
          <textarea
            placeholder="Deliverable Description"
            value={deliverable.description}
            onChange={(e) => updateDeliverable(index, "description", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
            rows={4}
          />
          <input
            type="text"
            placeholder="Instruction for AI improvement"
            value={deliverable.userInstruction}
            onChange={(e) => updateDeliverable(index, "userInstruction", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
          <button
            onClick={() => handleGenerate(index)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            ✨ Improve with AI
          </button>
        </div>
      ))}

      <button
        onClick={addDeliverable}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
      >
        ➕ Add Deliverable
      </button>

      <div className="flex justify-between pt-4">
        <button
          onClick={prev}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ⬅ Back
        </button>
        <button
          onClick={next}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Next ➜
        </button>
      </div>
    </div>
  );
}
