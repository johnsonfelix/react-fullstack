"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type AttachmentInState = { filename?: string; data?: string; mimeType?: string; url?: string };

type Question = {
  id?: string | null;
  text: string;
  description?: string | null;
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
  { value: "file", label: "File Attachment" },
];

export default function EditQuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errors, setErrors] = useState({ name: false, questions: false });

  useEffect(() => {
    if (params?.id) fetchTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/administration/questionnaire-templates/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setName(data.name || "");
      setDescription(data.description || "");
      const normalizeQ = (q: any, idx = 0): Question => ({
        id: q.id ?? undefined,
        text: q.text ?? "",
        description: q.description ?? null,
        type: q.type ?? "text",
        required: !!q.required,
        order: typeof q.order === "number" ? q.order : idx,
        options: Array.isArray(q.options) ? q.options : [],
        attachments: Array.isArray(q.attachments)
          ? q.attachments.map((a: any) => ({ filename: a.filename, url: a.url, data: a.data, mimeType: a.mimeType }))
          : [],
        subQuestions: Array.isArray(q.subQuestions) ? q.subQuestions.map((sq: any, sidx: number) => normalizeQ(sq, sidx)) : [],
      });

      setQuestions(Array.isArray(data.questions) ? data.questions.map((q: any, i: number) => normalizeQ(q, i)) : []);
    } catch (err) {
      console.error("Failed to fetch template:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateId = (prefix = "q") => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // helpers to operate on nested tree by path (array of indices)
  function cloneQuestions() {
    return JSON.parse(JSON.stringify(questions)) as Question[];
  }

  function updateAtPath(path: number[], updater: (q: Question) => Question) {
    setQuestions((prev) => {
      const clone = JSON.parse(JSON.stringify(prev)) as Question[];
      if (path.length === 0) return clone;
      let cur: any = clone;
      for (let i = 0; i < path.length - 1; i++) {
        cur = cur[path[i]].subQuestions ||= [];
      }
      cur[path[path.length - 1]] = updater(cur[path[path.length - 1]]);
      return clone;
    });
  }

  function insertSubQuestion(path: number[]) {
    const newQ: Question = { id: undefined, text: "", description: "", type: "text", required: false, order: 0, options: [], attachments: [], subQuestions: [] };
    setQuestions((prev) => {
      const clone = JSON.parse(JSON.stringify(prev)) as Question[];
      let cur: any = clone;
      for (let i = 0; i < path.length; i++) {
        cur = cur[path[i]].subQuestions ||= [];
      }
      cur.push(newQ);
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
      let cur: any = clone;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]].subQuestions ||= [];
      cur.splice(path[path.length - 1], 1);
      cur.forEach((q: any, i: number) => (q.order = i));
      return clone;
    });
  }

  function moveAtPath(path: number[], direction: "up" | "down") {
    setQuestions((prev) => {
      const clone = JSON.parse(JSON.stringify(prev)) as Question[];
      if (path.length === 0) return clone;
      let parent: any = clone;
      for (let i = 0; i < path.length - 1; i++) parent = parent[path[i]].subQuestions ||= [];
      const idx = path[path.length - 1];
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= parent.length) return clone;
      [parent[idx], parent[newIdx]] = [parent[newIdx], parent[idx]];
      parent.forEach((q: any, i: number) => (q.order = i));
      return clone;
    });
  }

  function addOptionAtPath(path: number[]) {
    updateAtPath(path, (q) => {
      q.options = q.options || [];
      q.options.push(`Option ${q.options.length + 1}`);
      return q;
    });
  }

  function updateOptionAtPath(path: number[], optIndex: number, value: string) {
    updateAtPath(path, (q) => {
      q.options[optIndex] = value;
      return q;
    });
  }

  function removeOptionAtPath(path: number[], optIndex: number) {
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

  function removeAttachmentAtPath(path: number[], attIndex: number) {
    updateAtPath(path, (q) => {
      (q.attachments ||= []).splice(attIndex, 1);
      return q;
    });
  }

  function ensureTextExists(qs?: Question[]): boolean {
    if (!qs || qs.length === 0) return false;
    for (const q of qs) {
      if (!q.text || !q.text.trim()) return false;
      if (q.type === "radio" && (!Array.isArray(q.options) || q.options.length < 2)) return false;
      if (q.subQuestions && q.subQuestions.length) {
        if (!ensureTextExists(q.subQuestions)) return false;
      }
    }
    return true;
  }

  function buildPayloadQuestion(q: Question, order: number) {
    return {
      id: q.id ?? undefined,
      text: q.text,
      description: q.description ?? null,
      type: q.type,
      required: q.required,
      order,
      options: q.type === "radio" ? q.options : null,
      attachments: (q.attachments || []).map((a) => (a.url ? { url: a.url } : { filename: a.filename, data: a.data, mimeType: a.mimeType })),
      subQuestions: (q.subQuestions || []).map((sq, idx) => buildPayloadQuestion(sq, idx)),
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = { name: !name.trim(), questions: questions.length === 0 };
    setErrors(newErrors);
    if (newErrors.name || newErrors.questions) return;

    if (!ensureTextExists(questions)) {
      alert("Ensure all questions have text and radio questions have at least 2 options.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description,
        questions: questions.map((q, idx) => buildPayloadQuestion(q, idx)),
      };

      const res = await fetch(`/api/administration/questionnaire-templates/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to update questionnaire");
      } else {
        router.push(`/administration/questionnaires/${params.id}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error while saving");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="container mx-auto p-8">Loading...</div>;

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      <h1 className="text-4xl font-bold mb-8">Edit Questionnaire</h1>

      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Template Information</h2>
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">Template Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Template name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">Template name is required</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[80px]"
              placeholder="Brief description"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Questions</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setQuestions((s) => [...s, { id: undefined, text: "", description: "", type: "text", required: false, order: s.length, options: [], attachments: [], subQuestions: [] }])} className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 transition">+ Add Question</button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No questions added yet</p>
              <button type="button" onClick={() => setQuestions((s) => [...s, { id: undefined, text: "", description: "", type: "text", required: false, order: s.length, options: [], attachments: [], subQuestions: [] }])} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">Add Your First Question</button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, i) => (
                <QuestionEditor
                  key={q.id ?? i}
                  q={q}
                  path={[i]}
                  updateAtPath={updateAtPath}
                  insertSubQuestion={insertSubQuestion}
                  deleteAtPath={deleteAtPath}
                  moveAtPath={moveAtPath}
                  addOptionAtPath={addOptionAtPath}
                  updateOptionAtPath={updateOptionAtPath}
                  removeOptionAtPath={removeOptionAtPath}
                  handleFileInput={handleFileInput}
                  removeAttachmentAtPath={removeAttachmentAtPath}
                />
              ))}
            </div>
          )}

          {errors.questions && <p className="text-red-500 text-xs mt-2">At least one question is required</p>}
        </div>

        <div className="flex gap-3 justify-end">
          <Link href={`/administration/questionnaires/${params.id}`}>
            <button type="button" className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">Cancel</button>
          </Link>

          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </form>
    </div>
  );
}

function QuestionEditor({ q, path, updateAtPath, insertSubQuestion, deleteAtPath, moveAtPath, addOptionAtPath, updateOptionAtPath, removeOptionAtPath, handleFileInput, removeAttachmentAtPath }: any) {
  function setField(field: string, value: any) {
    updateAtPath(path, (cur: Question) => {
      const copy = { ...cur } as any;
      copy[field] = value;
      // type switch behavior
      if (field === "type") {
        if (value === "radio" && (!copy.options || copy.options.length === 0)) copy.options = ["Option 1", "Option 2"];
        if (value !== "radio") copy.options = [];
      }
      return copy;
    });
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-sm font-medium">Question</div>
          <input type="text" value={q.text} onChange={(e) => setField("text", e.target.value)} className="w-full px-2 py-1 border rounded mt-1" placeholder="Question text" />
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => insertSubQuestion(path)} className="px-2 py-1 bg-blue-500 text-white rounded">+ SubQ</button>
          <button type="button" onClick={() => moveAtPath(path, "up")} className="px-2 py-1 bg-gray-100 rounded" title="Move up">↑</button>
          <button type="button" onClick={() => moveAtPath(path, "down")} className="px-2 py-1 bg-gray-100 rounded" title="Move down">↓</button>
          <button type="button" onClick={() => deleteAtPath(path)} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
        </div>
      </div>

      <div className="mb-2">
        <input type="text" value={q.description ?? ""} onChange={(e) => setField("description", e.target.value)} placeholder="Description (help text)" className="w-full px-2 py-1 border rounded" />
      </div>

      <div className="mb-2 flex gap-2 items-center">
        <label className="text-sm">Type</label>
        <select value={q.type} onChange={(e) => setField("type", e.target.value)} className="px-2 py-1 border rounded">
          {questionTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 ml-4"><input type="checkbox" checked={q.required} onChange={(e) => setField("required", e.target.checked)} /> Required</label>
      </div>

      {q.type === "radio" && (
        <div className="mb-2">
          <div className="text-sm font-medium mb-1">Options</div>
          {(q.options || []).map((opt: string, oi: number) => (
            <div key={oi} className="flex gap-2 items-center mb-1">
              <input value={opt} onChange={(e) => updateOptionAtPath(path, oi, e.target.value)} className="flex-1 px-2 py-1 border rounded" />
              <button type="button" onClick={() => removeOptionAtPath(path, oi)} className="px-2 py-1 bg-red-400 rounded">×</button>
            </div>
          ))}
          <button type="button" onClick={() => addOptionAtPath(path)} className="px-2 py-1 bg-gray-200 rounded">+ Add Option</button>
        </div>
      )}

      {/* <div className="mb-2">
        <div className="text-sm font-medium">Attachments</div>
        <div className="flex gap-2 items-center mt-2">
          <input type="file" onChange={(e) => handleFileInput(path, e.target.files)} />
        </div>
        <div className="mt-2">
          {(q.attachments || []).map((att: AttachmentInState, ai: number) => (
            <div key={ai} className="flex items-center gap-2">
              {att.url ? (
                <a href={att.url} target="_blank" rel="noreferrer" className="underline">{att.filename || att.url}</a>
              ) : att.filename && att.data ? (
                <a href={att.data} target="_blank" rel="noreferrer" className="underline">{att.filename}</a>
              ) : (
                <span className="text-gray-500">{att.filename || 'Attachment'}</span>
              )}
              {att.mimeType && <span className="text-xs text-gray-400">{att.mimeType}</span>}
              <button type="button" onClick={() => removeAttachmentAtPath(path, ai)} className="px-2 py-1 bg-red-400 rounded ml-2">Remove</button>
            </div>
          ))}
        </div>
      </div> */}

      {q.subQuestions && q.subQuestions.length > 0 && (
        <div className="pl-4 border-l mt-3 space-y-3">
          {q.subQuestions.map((sq: Question, si: number) => (
            <QuestionEditor key={sq.id ?? si} q={sq} path={[...path, si]} updateAtPath={updateAtPath} insertSubQuestion={insertSubQuestion} deleteAtPath={deleteAtPath} moveAtPath={moveAtPath} addOptionAtPath={addOptionAtPath} updateOptionAtPath={updateOptionAtPath} removeOptionAtPath={removeOptionAtPath} handleFileInput={handleFileInput} removeAttachmentAtPath={removeAttachmentAtPath} />
          ))}
        </div>
      )}
    </div>
  );
}
