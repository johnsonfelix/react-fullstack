"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const questionTypes = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Checkbox (Yes/No)" },
  { value: "radio", label: "Radio Buttons" },
  { value: "date", label: "Date" },
  { value: "file", label: "File Attachment" },
];

export default function ViewQuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (params?.id) fetchTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/administration/questionnaire-templates/${params.id}`
      );
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setTemplate(data);
    } catch (error) {
      console.error("Failed to fetch template:", error);
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!template) return;
    const confirmMsg = template.isActive
      ? "Are you sure you want to deactivate this questionnaire?"
      : "Activate this questionnaire?";
    if (!window.confirm(confirmMsg)) return;

    setToggling(true);
    try {
      const res = await fetch(
        `/api/administration/questionnaire-templates/${params.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !template.isActive }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to update status");
        return;
      }
      const updated = await res.json();
      setTemplate(updated);
    } catch (err) {
      console.error("Toggle active error:", err);
      alert("An error occurred while updating status");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-8">Loading...</div>;
  }

  if (!template) {
    return <div className="container mx-auto p-8">Template not found</div>;
  }

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">View Questionnaire</h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            ← Back to List
          </button>

          {/* <button
            onClick={handleToggleActive}
            disabled={toggling}
            className={`px-4 py-2 rounded-lg text-white transition ${
              template.isActive
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-teal-600 hover:bg-teal-700"
            } ${toggling ? "opacity-60" : ""}`}
            title={template.isActive ? "Deactivate template" : "Activate template"}
          >
            {toggling
              ? template.isActive
                ? "Deactivating..."
                : "Activating..."
              : template.isActive
              ? "Deactivate"
              : "Activate"}
          </button> */}

          <Link href={`/administration/questionnaires/${template.id}/edit`}>
            <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition">
              Edit
            </button>
          </Link>
        </div>
      </div>

      {/* Template Details */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
        <div className="mb-6">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-4 ${
              template.isActive
                ? "bg-teal-100 text-teal-700 border border-teal-200"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            {template.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <h2 className="text-3xl font-bold mb-2">{template.name}</h2>
        {template.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-4">{template.description}</p>
        )}
        <div className="text-sm text-gray-500">
          {template.createdAt && (
            <span>Created {new Date(template.createdAt).toLocaleString()} • </span>
          )}
          <span>
            {Array.isArray(template.questions) ? template.questions.length : 0} question
            {Array.isArray(template.questions) && template.questions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-6">Questions</h3>

        <div className="space-y-3">
          {Array.isArray(template.questions) && template.questions.length > 0 ? (
            template.questions.map((q: any, idx: number) => (
              <QuestionItem key={q.id || idx} q={q} index={idx} path={[idx + 1]} />
            ))
          ) : (
            <div className="text-sm text-gray-500">No questions available</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Recursive renderer for a question and its sub-questions
function QuestionItem({ q, index, path }: { q: any; index: number; path: (number | string)[] }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-sm font-semibold">Question {path.join(".")}</div>
          <div className="mt-1 text-lg font-medium">{q.text}</div>
          {q.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{q.description}</p>
          )}
        </div>
        <div className="text-sm text-gray-500 text-right">
          <div>{getTypeLabel(q.type)}</div>
          <div className="mt-1">{q.required ? "Required" : "Optional"}</div>
        </div>
      </div>

      {q.options && q.options.length > 0 && (
        <div className="mt-2 text-sm text-gray-600">Options: {q.options.join(", ")}</div>
      )}

      {q.attachments && q.attachments.length > 0 && (
        <div className="mt-3">
          <div className="text-sm font-medium mb-2">Attachments</div>
          <div className="space-y-1 text-sm">
            {q.attachments.map((att: any, ai: number) => (
              <div key={ai} className="flex items-center gap-3">
                {att.url ? (
                  <a href={att.url} target="_blank" rel="noreferrer" className="underline">
                    {att.filename || att.url}
                  </a>
                ) : att.filename && att.data ? (
                  // data URL present (created on client) - allow open in new tab
                  <a href={att.data} target="_blank" rel="noreferrer" className="underline">
                    {att.filename}
                  </a>
                ) : (
                  <span className="text-gray-500">{att.filename || 'Attachment'}</span>
                )}
                {att.mimeType && <span className="text-xs text-gray-400">{att.mimeType}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {q.subQuestions && q.subQuestions.length > 0 && (
        <div className="pl-4 border-l mt-4 space-y-3">
          {q.subQuestions.map((sq: any, sidx: number) => (
            <QuestionItem key={sq.id || sidx} q={sq} index={sidx} path={[...path, sidx + 1]} />
          ))}
        </div>
      )}
    </div>
  );
}

function getTypeLabel(type?: string) {
  return questionTypes.find((t) => t.value === type)?.label || (type ?? "-");
}
