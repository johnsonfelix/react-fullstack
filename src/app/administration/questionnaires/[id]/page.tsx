// app/administration/questionnaires/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
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
] as const;

type QuestionTypeValue = (typeof questionTypes)[number]["value"];

// Match your backend shape (now includes `validation`)
type DBQuestion = {
  id: string;
  text: string;
  description?: string | null;
  type?: QuestionTypeValue | string | null;
  required?: boolean | null;
  order?: number | null;
  options?: any;               // Prisma Json
  attachments?: any[] | string[]; // string[] or legacy objects
  subQuestions?: DBQuestion[];
  validation?: any | null;     // e.g. { showWhen: { parentOptionEquals: "Yes" } }
};

type TemplateResp = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  category?: { id: string; name: string } | null;
  questions: DBQuestion[];
};

export default function ViewQuestionnairePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (params?.id) fetchTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/administration/questionnaire-templates/${params.id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data: TemplateResp = await res.json();
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
      const res = await fetch(`/api/administration/questionnaire-templates/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !template.isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to update status");
        return;
      }
      const updated = (await res.json()) as TemplateResp;
      setTemplate(updated);
    } catch (err) {
      console.error("Toggle active error:", err);
      alert("An error occurred while updating status");
    } finally {
      setToggling(false);
    }
  };

  // Count total questions including nested
  const totalQuestions = useMemo(() => {
    function count(qs?: DBQuestion[]): number {
      if (!qs || !qs.length) return 0;
      return qs.reduce((sum, q) => sum + 1 + count(q.subQuestions), 0);
    }
    return count(template?.questions);
  }, [template]);

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
            onClick={() => router.push("/administration/questionnaires")}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            ← Back to List
          </button>

          {/* Toggle (uncomment when your PATCH route is wired) */}
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
        <div className="flex items-center gap-3 mb-5">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              template.isActive
                ? "bg-teal-100 text-teal-700 border border-teal-200"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            {template.isActive ? "Active" : "Inactive"}
          </span>

          {template.category?.name && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
              {template.category.name}
            </span>
          )}
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
            {totalQuestions} question{totalQuestions !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-6">Questions</h3>

        <div className="space-y-3">
          {Array.isArray(template.questions) && template.questions.length > 0 ? (
            template.questions.map((q, idx) => (
              <QuestionItem key={q.id || idx} q={q} path={[idx + 1]} />
            ))
          ) : (
            <div className="text-sm text-gray-500">No questions available</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Recursive question item
   ========================= */
function QuestionItem({ q, path }: { q: DBQuestion; path: (number | string)[] }) {
  const typeLabel = getTypeLabel(q.type);
  const optionsText = getOptionsText(q.options);

  // Extract conditional hint if present
  const condHint = getConditionHint(q.validation);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-sm font-semibold">Question {path.join(".")}</div>
          <div className="mt-1 text-lg font-medium">{q.text}</div>

          {/* Conditional visibility badge (for sub-questions) */}
          {condHint && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                {condHint}
              </span>
            </div>
          )}

          {q.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{q.description}</p>
          )}
        </div>

        <div className="text-sm text-gray-500 text-right">
          <div>{typeLabel}</div>
          <div className="mt-1">{q.required ? "Required" : "Optional"}</div>
        </div>
      </div>

      {optionsText && (
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">Options:</span> {optionsText}
        </div>
      )}

      {/* Attachments: string[] or legacy objects */}
      {Array.isArray(q.attachments) && q.attachments.length > 0 && (
        <div className="mt-3">
          <div className="text-sm font-medium mb-2">Attachments</div>
          <div className="space-y-1 text-sm">
            {q.attachments.map((att: any, ai: number) => {
              if (typeof att === "string") {
                const fileName = att.split("/").pop() || `file-${ai + 1}`;
                return (
                  <div key={ai} className="flex items-center gap-3">
                    <a href={att} target="_blank" rel="noreferrer" className="underline">
                      {fileName}
                    </a>
                  </div>
                );
              }
              if (att?.url) {
                const label = att.filename || att.url;
                return (
                  <div key={ai} className="flex items-center gap-3">
                    <a href={att.url} target="_blank" rel="noreferrer" className="underline">
                      {label}
                    </a>
                  </div>
                );
              }
              if (att?.data && att?.filename) {
                return (
                  <div key={ai} className="flex items-center gap-3">
                    <a href={att.data} target="_blank" rel="noreferrer" className="underline">
                      {att.filename}
                    </a>
                  </div>
                );
              }
              return (
                <div key={ai} className="text-gray-500">
                  Attachment {ai + 1}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {q.subQuestions && q.subQuestions.length > 0 && (
        <div className="pl-4 border-l mt-4 space-y-3">
          {q.subQuestions.map((sq, sidx) => (
            <QuestionItem key={sq.id || sidx} q={sq} path={[...path, sidx + 1]} />
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================
   Helpers
   ========================= */
function getTypeLabel(type?: string | null) {
  if (!type) return "-";
  return questionTypes.find((t) => t.value === type)?.label || type;
}

function getOptionsText(options: any): string {
  if (!options) return "";
  try {
    if (Array.isArray(options)) return options.join(", ");
    if (typeof options === "string") {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) return parsed.join(", ");
      if (parsed && typeof parsed === "object") return Object.values(parsed).map(String).join(", ");
      return String(parsed);
    }
    if (typeof options === "object") {
      return Object.values(options).map(String).join(", ");
    }
    return String(options);
  } catch {
    return "";
  }
}

function getConditionHint(validation: any): string | null {
  // We expect: { showWhen: { parentOptionEquals: "Yes" } }
  if (!validation || typeof validation !== "object") return null;
  const showWhen = validation.showWhen;
  if (showWhen && typeof showWhen === "object" && "parentOptionEquals" in showWhen) {
    const val = showWhen.parentOptionEquals;
    if (typeof val === "string" && val.trim()) {
      return `Shown when parent answer is “${val}”`;
    }
  }
  return null;
}
