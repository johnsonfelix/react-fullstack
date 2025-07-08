"use client";

import { useEffect, useState } from "react";
import { Loader } from "lucide-react";

type QuestionType = {
  id: string;
  question: string;
  answer: string;
};

export default function SlideAIQuestions({
  procurementDraft,
  setProcurementDraft,
  next,
  prev,
}: {
  procurementDraft: any;
  setProcurementDraft: (draft: any) => void;
  next: () => void;
  prev: () => void;
}) {
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (procurementDraft.aiQuestions?.length > 0) {
      setQuestions(procurementDraft.aiQuestions);
      return;
    }
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/ai/generate-ai-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: procurementDraft.description ?? "general procurement",
          }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch AI questions.");
        }
        const data = await res.json();
        const manualQuestion = {
          id: "manual-question",
          question: "Is there anything else you need to mention about this project?",
          answer: "",
        };
        const updatedQuestions = [...data, manualQuestion];
        setQuestions(updatedQuestions);
        setProcurementDraft({ ...procurementDraft, aiQuestions: updatedQuestions });
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Error generating questions.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const handleAnswerChange = (index: number, value: string) => {
    const updated = [...questions];
    updated[index].answer = value;
    setQuestions(updated);
    setProcurementDraft({ ...procurementDraft, aiQuestions: updated });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">🤖 AI-Generated Questions</h2>
      <p className="text-gray-600">
        Answer these to help suppliers understand your needs better.
      </p>

      {loading && (
        <div className="flex items-center space-x-2 text-blue-600">
          <Loader className="animate-spin" />
          <span>Generating questions...</span>
        </div>
      )}

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
      )}

      {!loading && questions.length > 0 && (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="space-y-1 bg-gray-50 border border-gray-200 rounded-lg p-4"
            >
              <label className="font-medium text-gray-800">{q.question}</label>
              <textarea
                value={q.answer}
                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                placeholder="Your answer..."
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>
          ))}
        </div>
      )}

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
