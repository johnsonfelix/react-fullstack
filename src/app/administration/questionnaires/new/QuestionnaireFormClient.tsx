// app/administration/questionnaires/new/QuestionnaireFormClient.tsx
"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AttachmentInState = { filename: string; data?: string; mimeType?: string; url?: string };
type Question = {
  id: string;
  text: string;
  description?: string;
  type: string;
  required: boolean;
  order: number;
  options: string[];
  attachments?: AttachmentInState[];
  subQuestions?: Question[];
};

const questionTypes = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Checkbox (Yes/No)" },
  { value: "radio", label: "Radio Buttons" },
  { value: "date", label: "Date" },
  { value: "file", label: "File Attachment (ask for file)" },
];

type QuestionEditorProps = {
  q: Question;
  path: number[];
  questionTypes: typeof questionTypes;
  updateAtPath: (path: number[], updater: (q: Question) => Question) => void;
  insertSubQuestion: (path: number[]) => void;
  deleteAtPath: (path: number[]) => void;
  addOption: (path: number[]) => void;
  updateOption: (path: number[], optIndex: number, value: string) => void;
  removeOption: (path: number[], optIndex: number) => void;
  handleFileInput: (path: number[], files: FileList | null) => Promise<void> | void;
  removeAttachment: (path: number[], attIndex: number) => void;
};

// Keep QuestionEditor outside main component to avoid re-declaring on each render
const QuestionEditor: React.FC<QuestionEditorProps> = ({
  q,
  path,
  questionTypes,
  updateAtPath,
  insertSubQuestion,
  deleteAtPath,
  addOption,
  updateOption,
  removeOption,
  handleFileInput,
  removeAttachment,
}) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-sm font-medium">Question</div>
          <input
            type="text"
            value={q.text}
            onChange={(e) => updateAtPath(path, (x) => ({ ...x, text: e.target.value }))}
            className="w-full px-2 py-1 border rounded mt-1"
            placeholder="Question text"
          />
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => insertSubQuestion(path)} className="px-2 py-1 bg-blue-500 text-white rounded">
            + SubQ
          </button>
          <button type="button" onClick={() => deleteAtPath(path)} className="px-2 py-1 bg-red-500 text-white rounded">
            Delete
          </button>
        </div>
      </div>

      <div className="mb-2">
        <input
          type="text"
          value={q.description ?? ""}
          onChange={(e) => updateAtPath(path, (x) => ({ ...x, description: e.target.value }))}
          placeholder="Description (help text)"
          className="w-full px-2 py-1 border rounded"
        />
      </div>

      <div className="mb-2 flex gap-2 items-center">
        <label className="text-sm">Type</label>
        <select
          value={q.type}
          onChange={(e) =>
            updateAtPath(path, (x) => ({
              ...x,
              type: e.target.value,
              options: e.target.value === "radio" ? (x.options.length ? x.options : ["Option 1", "Option 2"]) : [],
            }))
          }
          className="px-2 py-1 border rounded"
        >
          {questionTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 ml-4">
          <input type="checkbox" checked={q.required} onChange={(e) => updateAtPath(path, (x) => ({ ...x, required: e.target.checked }))} />{" "}
          Required
        </label>
      </div>

      {q.type === "radio" && (
        <div className="mb-2">
          <div className="text-sm font-medium mb-1">Options</div>
          {(q.options || []).map((opt, oi) => (
            <div key={oi} className="flex gap-2 items-center mb-1">
              <input value={opt} onChange={(e) => updateOption(path, oi, e.target.value)} className="flex-1 px-2 py-1 border rounded" />
              <button type="button" onClick={() => removeOption(path, oi)} className="px-2 py-1 bg-red-400 rounded">
                ×
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addOption(path)} className="px-2 py-1 bg-gray-200 rounded">
            + Add Option
          </button>
        </div>
      )}

      {q.subQuestions && q.subQuestions.length > 0 && (
        <div className="pl-4 border-l mt-3 space-y-3">
          {q.subQuestions.map((sq, si) => (
            <QuestionEditor
              key={sq.id}
              q={sq}
              path={[...path, si]}
              questionTypes={questionTypes}
              updateAtPath={updateAtPath}
              insertSubQuestion={insertSubQuestion}
              deleteAtPath={deleteAtPath}
              addOption={addOption}
              updateOption={updateOption}
              removeOption={removeOption}
              handleFileInput={handleFileInput}
              removeAttachment={removeAttachment}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function QuestionnaireFormClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({ name: false, questions: false });
  const searchParams = useSearchParams();
  const categoryId = searchParams?.get("categoryId") ?? null;

  const generateId = (prefix = "q") => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  function addRootQuestion() {
    const q: Question = {
      id: generateId(),
      text: "",
      description: "",
      type: "text",
      required: false,
      order: questions.length,
      options: [],
      attachments: [],
      subQuestions: [],
    };
    setQuestions((s) => [...s, q]);
  }

  function updateAtPath(path: number[], updater: (q: Question) => Question) {
    setQuestions((prev) => {
      const clone = JSON.parse(JSON.stringify(prev)) as Question[];
      let curArr: Question[] = clone;
      for (let i = 0; i < path.length - 1; i++) {
        curArr = curArr[path[i]].subQuestions || [];
      }
      const index = path[path.length - 1];
      curArr[index] = updater(curArr[index]);
      return clone;
    });
  }

  function insertSubQuestion(path: number[]) {
    const newQ: Question = { id: generateId(), text: "", description: "", type: "text", required: false, order: 0, options: [], attachments: [], subQuestions: [] };
    setQuestions((prev) => {
      const clone = JSON.parse(JSON.stringify(prev)) as Question[];
      let curArr: Question[] = clone;
      for (let i = 0; i < path.length; i++) {
        curArr = curArr[path[i]].subQuestions ||= [];
      }
      curArr.push(newQ);
      return clone;
    });
  }

  function deleteAtPath(path: number[]) {
    setQuestions((prev) => {
      const clone = JSON.parse(JSON.stringify(prev)) as Question[];
      if (path.length === 1) {
        clone.splice(path[0], 1);
        clone.forEach((q, i) => (q.order = i));
        return clone;
      }
      let curArr = clone;
      for (let i = 0; i < path.length - 1; i++) curArr = curArr[path[i]].subQuestions || [];
      curArr.splice(path[path.length - 1], 1);
      curArr.forEach((q, i) => (q.order = i));
      return clone;
    });
  }

  function addOption(path: number[]) {
    updateAtPath(path, (q) => {
      q.options = q.options || [];
      q.options.push(`Option ${q.options.length + 1}`);
      return q;
    });
  }
  function updateOption(path: number[], optIndex: number, value: string) {
    updateAtPath(path, (q) => {
      q.options[optIndex] = value;
      return q;
    });
  }
  function removeOption(path: number[], optIndex: number) {
    updateAtPath(path, (q) => {
      q.options.splice(optIndex, 1);
      return q;
    });
  }

  async function handleFileInput(path: number[], files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateAtPath(path, (q) => {
        q.attachments = q.attachments || [];
        q.attachments.push({ filename: file.name, data: dataUrl, mimeType: file.type });
        return q;
      });
    };
    reader.readAsDataURL(file);
  }

  function removeAttachment(path: number[], attIndex: number) {
    updateAtPath(path, (q) => {
      (q.attachments || []).splice(attIndex, 1);
      return q;
    });
  }

  function validateQuestionsTree(qs: Question[]): boolean {
    if (!qs || qs.length === 0) return false;
    for (const q of qs) {
      if (!q.text || !q.text.trim()) return false;
      if (q.type === "radio" && (!q.options || q.options.length < 2)) return false;
      if (q.subQuestions && q.subQuestions.length) {
        if (!validateQuestionsTree(q.subQuestions)) return false;
      }
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nameErr = !name.trim();
    const qErr = questions.length === 0;
    setErrors({ name: nameErr, questions: qErr });
    if (nameErr || qErr) return;

    if (!validateQuestionsTree(questions)) {
      alert("Ensure all questions have text and radio questions have at least 2 options.");
      return;
    }

    if (!categoryId) {
      alert("Category is required. Please open this page with a categoryId query parameter.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name,
        description,
        questions: questions.map((q, idx) => buildPayloadQuestion(q, idx)),
        categoryId,
      };

      const res = await fetch("/api/administration/questionnaire-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to create questionnaire");
      } else {
        router.push("/administration/questionnaires");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating template");
    } finally {
      setSaving(false);
    }
  }

  function buildPayloadQuestion(q: Question, order: number) {
    return {
      text: q.text,
      description: q.description || null,
      type: q.type,
      required: q.required,
      order,
      options: q.type === "radio" ? q.options : null,
      attachments: q.attachments?.map((a) => (a.url ? { url: a.url } : { filename: a.filename, data: a.data, mimeType: a.mimeType })) ?? [],
      subQuestions: q.subQuestions?.map((sq, idx) => buildPayloadQuestion(sq, idx)) ?? [],
    };
  }

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      <h1 className="text-4xl font-bold mb-6">Create New Questionnaire</h1>
      <form onSubmit={handleSubmit}>
        <div className="bg-white p-4 rounded mb-6">
          <label className="block mb-2">Template Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Name" />
          {errors.name && <div className="text-red-500 text-sm">Template name required</div>}
          <label className="block mt-3 mb-2">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>

        <div className="bg-white p-4 rounded mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl">Questions</h2>
            <div>
              <button type="button" onClick={addRootQuestion} className="px-3 py-1 bg-teal-500 text-white rounded">
                + Add Question
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-8">
              <p>No questions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, i) => (
                <QuestionEditor
                  key={q.id}
                  q={q}
                  path={[i]}
                  questionTypes={questionTypes}
                  updateAtPath={updateAtPath}
                  insertSubQuestion={insertSubQuestion}
                  deleteAtPath={deleteAtPath}
                  addOption={addOption}
                  updateOption={updateOption}
                  removeOption={removeOption}
                  handleFileInput={handleFileInput}
                  removeAttachment={removeAttachment}
                />
              ))}
            </div>
          )}
          {errors.questions && <div className="text-red-500 text-sm mt-2">At least one question required</div>}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 bg-gray-200 rounded">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-500 text-white rounded">
            {saving ? "Creating..." : "Create Questionnaire"}
          </button>
        </div>
      </form>
    </div>
  );
}
