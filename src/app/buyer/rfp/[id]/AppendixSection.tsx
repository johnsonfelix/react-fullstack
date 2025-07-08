"use client";

export default function AppendixSection({ procurement }: any) {
  const aiQuestions = procurement.aiQuestions ?? [];

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Appendix</h2>

      {aiQuestions.length > 0 ? (
        <div className="space-y-4">
          {aiQuestions.map((q: any, idx: number) => (
            <div key={idx} className="p-4 border rounded bg-white">
              <p className="font-semibold">
                Q{idx + 1}. {q.question}
              </p>
              <p className="mt-1 text-gray-700">
                <span className="font-medium">Answer:</span> {q.answer || "Not answered"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No AI-generated questions available for this procurement.</p>
      )}
    </div>
  );
}
