"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Upload, X, FileText, Info } from "lucide-react";
import Link from "next/link";

/* =========================
   Types shared with editor
   ========================= */
type AttachmentInState = {
  filename: string;
  data?: string;
  mimeType?: string;
  url?: string;
};

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
  helperText?: string;
  // conditional visibility for sub-questions
  validation?: {
    showWhen?: { parentOptionEquals?: string };
  } | null;
};

type Section = {
  id: string;
  name: string;
  order: number;
  questions: Question[];
};

const questionTypes = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Checkbox (Yes/No)" },
  { value: "radio", label: "Radio Buttons" },
  { value: "date", label: "Date" },
  { value: "file", label: "File Attachment" },
] as const;

/* =========================
   API shapes
   ========================= */
type DBQuestion = {
  id: string;
  text: string;
  description?: string | null;
  type?: string | null;
  required?: boolean | null;
  order?: number | null;
  options?: any; // Prisma Json
  attachments?: any[] | string[];
  subQuestions?: DBQuestion[];
  validation?: any | null; // { showWhen: { parentOptionEquals: "Yes" } }
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

/* ============================================================
   Question Editor (supports conditional sub-questions editing)
   ============================================================ */
type QuestionEditorProps = {
  q: Question;
  path: number[];
  sectionIndex: number;
  parentOptions?: string[]; // for conditional controls
  updateQuestion: (
    sectionIdx: number,
    path: number[],
    updater: (q: Question) => Question
  ) => void;
  insertSubQuestion: (sectionIdx: number, path: number[]) => void;
  deleteQuestion: (sectionIdx: number, path: number[]) => void;
  addOption: (sectionIdx: number, path: number[]) => void;
  updateOption: (sectionIdx: number, path: number[], optIndex: number, value: string) => void;
  removeOption: (sectionIdx: number, path: number[], optIndex: number) => void;
  handleFileInput: (
    sectionIdx: number,
    path: number[],
    files: FileList | null
  ) => Promise<void> | void;
  removeAttachment: (sectionIdx: number, path: number[], attIndex: number) => void;
};

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  q,
  path,
  sectionIndex,
  parentOptions,
  updateQuestion,
  insertSubQuestion,
  deleteQuestion,
  addOption,
  updateOption,
  removeOption,
  handleFileInput,
  removeAttachment,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const getQuestionNumber = () => path.map((p) => p + 1).join(".");

  const isChild = !!parentOptions && parentOptions.length > 0;

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <button type="button" onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-gray-100 rounded">
              {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
            <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
              {getQuestionNumber()}
            </span>
          </div>

          {!collapsed && (
            <>
              <input
                type="text"
                value={q.text}
                onChange={(e) => updateQuestion(sectionIndex, path, (x) => ({ ...x, text: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                placeholder="Enter question text"
              />

              <textarea
                value={q.description ?? ""}
                onChange={(e) => updateQuestion(sectionIndex, path, (x) => ({ ...x, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                rows={2}
              />

              <textarea
                value={q.helperText ?? ""}
                onChange={(e) => updateQuestion(sectionIndex, path, (x) => ({ ...x, helperText: e.target.value }))}
                placeholder="Helper text / instructions"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3"
                rows={2}
              />
            </>
          )}
        </div>

        <div className="flex gap-1 ml-2">
          <button
            type="button"
            onClick={() => insertSubQuestion(sectionIndex, path)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            + Sub-Q
          </button>
          <button
            type="button"
            onClick={() => deleteQuestion(sectionIndex, path)}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Type + Required */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
              <select
                value={q.type}
                onChange={(e) =>
                  updateQuestion(sectionIndex, path, (x) => ({
                    ...x,
                    type: e.target.value,
                    options:
                      e.target.value === "radio"
                        ? x.options.length
                          ? x.options
                          : ["Yes", "No"]
                        : [],
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {questionTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => updateQuestion(sectionIndex, path, (x) => ({ ...x, required: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Required</span>
              </label>
            </div>
          </div>

          {/* Conditional controls (only visible if this is a sub-question AND parent has radio options) */}
          {isChild && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="text-sm font-medium text-amber-900 mb-2">Conditional visibility</div>
              <label className="text-sm text-amber-800 block mb-1">
                Show this sub-question when the parent answer equals:
              </label>
              <select
                value={q.validation?.showWhen?.parentOptionEquals ?? ""}
                onChange={(e) =>
                  updateQuestion(sectionIndex, path, (x) => {
                    const sel = e.target.value;
                    const validation = { ...(x.validation || {}), showWhen: { parentOptionEquals: sel || undefined } };
                    return { ...x, validation };
                  })
                }
                className="w-full px-3 py-2 border border-amber-300 rounded-md bg-white"
              >
                <option value="">— Always show (no condition) —</option>
                {parentOptions!.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-xs text-amber-700 mt-1">
                Leave blank to always show. Choose an option to make this sub-question conditional.
              </p>
            </div>
          )}

          {/* Radio options */}
          {q.type === "radio" && (
            <div className="mb-3 p-3 bg-gray-50 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-2">Options</div>
              {(q.options || []).map((opt, oi) => (
                <div key={oi} className="flex gap-2 items-center mb-2">
                  <input
                    value={opt}
                    onChange={(e) => updateOption(sectionIndex, path, oi, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={`Option ${oi + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(sectionIndex, path, oi)}
                    className="px-3 py-2 bg-red-400 text-white rounded-md hover:bg-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(sectionIndex, path)}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                + Add Option
              </button>
            </div>
          )}

          {/* Attachments */}
          <div className="mb-3 p-3 bg-blue-50 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Question Attachments</span>
              <Info size={14} className="text-gray-400" />
            </div>

            {q.attachments && q.attachments.length > 0 && (
              <div className="space-y-2 mb-2">
                {q.attachments.map((att, ai) => (
                  <div key={ai} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                    <span className="text-sm text-gray-600 truncate">{att.filename || att.url}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(sectionIndex, path, ai)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
              <Upload size={16} className="text-gray-600" />
              <span className="text-sm text-gray-700">Add Attachment</span>
              <input
                type="file"
                onChange={(e) => handleFileInput(sectionIndex, path, e.target.files)}
                className="hidden"
              />
            </label>
          </div>

          {/* Sub-questions recursively; pass THIS question's options to children */}
          {q.subQuestions && q.subQuestions.length > 0 && (
            <div className="pl-4 border-l-2 border-blue-300 mt-4 space-y-3">
              <div className="text-sm font-medium text-blue-600 mb-2">Conditional Sub-Questions</div>
              {q.subQuestions.map((sq, si) => (
                <QuestionEditor
                  key={sq.id}
                  q={sq}
                  path={[...path, si]}
                  sectionIndex={sectionIndex}
                  parentOptions={q.type === "radio" ? q.options : undefined}
                  updateQuestion={updateQuestion}
                  insertSubQuestion={insertSubQuestion}
                  deleteQuestion={deleteQuestion}
                  addOption={addOption}
                  updateOption={updateOption}
                  removeOption={removeOption}
                  handleFileInput={handleFileInput}
                  removeAttachment={removeAttachment}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* =========================
   Edit Page
   ========================= */
export default function EditQuestionnairePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [templateId, setTemplateId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryName, setCategoryName] = useState<string>("");

  const [sections, setSections] = useState<Section[]>([]);
  const [errors, setErrors] = useState({ questions: false });

  // Load template and map to editor state (one dynamic section)
  useEffect(() => {
    (async () => {
      if (!params?.id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/administration/questionnaire-templates/${params.id}`);
        if (!res.ok) throw new Error("Failed to load template");
        const data: TemplateResp = await res.json();

        setTemplateId(data.id);
        setName(data.name || "");
        setDescription(data.description || "");
        setCategoryName(data.category?.name || "");

        const mappedQs = mapDBQuestionsToEditor(data.questions || []);
        setSections([
          {
            id: data.category?.id || "category",
            name: data.category?.name || "Category",
            order: 0,
            questions: mappedQs,
          },
        ]);
      } catch (e) {
        console.error("Edit load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.id]);

  // Helpers to map DB → editor
  function mapDBQuestionsToEditor(qs: DBQuestion[]): Question[] {
    return (qs || [])
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((q): Question => ({
        id: q.id || crypto.randomUUID(),
        text: q.text || "",
        description: q.description || "",
        helperText: "", // if you persisted it, map it here
        type: (q.type as string) || "text",
        required: !!q.required,
        order: q.order ?? 0,
        options: normalizeOptionsToStringArray(q.options),
        attachments: normalizeAttachments(q.attachments),
        subQuestions: q.subQuestions ? mapDBQuestionsToEditor(q.subQuestions) : [],
        validation: q.validation || null,
      }));
  }

  function normalizeOptionsToStringArray(options: any): string[] {
    try {
      if (!options) return [];
      if (Array.isArray(options)) return options.map(String);
      if (typeof options === "string") {
        const parsed = JSON.parse(options);
        if (Array.isArray(parsed)) return parsed.map(String);
        if (parsed && typeof parsed === "object") return Object.values(parsed).map(String);
        return [String(parsed)];
      }
      if (typeof options === "object") return Object.values(options).map(String);
      return [String(options)];
    } catch {
      return [];
    }
  }

  function normalizeAttachments(atts: any[] | string[] | undefined): AttachmentInState[] {
    if (!atts || !Array.isArray(atts)) return [];
    return atts.map((a: any, idx) => {
      if (typeof a === "string") {
        const filename = a.split("/").pop() || `file-${idx + 1}`;
        return { filename, url: a };
      }
      return {
        filename: a?.filename || a?.url || `file-${idx + 1}`,
        url: a?.url,
        data: a?.data,
        mimeType: a?.mimeType,
      };
    });
  }

  // === Editor operations (same as create) ===
  const generateId = (prefix = "q") => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  function addQuestionToSection(sectionIndex: number) {
    const base = sections[sectionIndex];
    if (!base) return;
    const newQuestion: Question = {
      id: generateId(),
      text: "",
      description: "",
      helperText: "",
      type: "text",
      required: false,
      order: base.questions?.length ?? 0,
      options: [],
      attachments: [],
      subQuestions: [],
      validation: null,
    };
    setSections((prev) =>
      prev.map((sec, i) => (i === sectionIndex ? { ...sec, questions: [...(sec.questions ?? []), newQuestion] } : sec))
    );
    setErrors((p) => ({ ...p, questions: false }));
  }

  function updateQuestion(sectionIdx: number, path: number[], updater: (q: Question) => Question) {
    setSections((prev) =>
      prev.map((sec, i) => {
        if (i !== sectionIdx) return sec;
        const next = [...sec.questions];
        let arr: Question[] = next;
        for (let d = 0; d < path.length - 1; d++) {
          const idx = path[d];
          const node = arr[idx];
          const subs = [...(node.subQuestions ?? [])];
          arr[idx] = { ...node, subQuestions: subs };
          arr = subs;
        }
        const leaf = path[path.length - 1];
        arr[leaf] = updater(arr[leaf]);
        return { ...sec, questions: next };
      })
    );
  }

  function insertSubQuestion(sectionIdx: number, path: number[]) {
    const newQ: Question = {
      id: generateId(),
      text: "",
      description: "",
      helperText: "",
      type: "text",
      required: false,
      order: 0,
      options: [],
      attachments: [],
      subQuestions: [],
      validation: null,
    };
    setSections((prev) =>
      prev.map((sec, i) => {
        if (i !== sectionIdx) return sec;
        const next = [...sec.questions];
        let arr: Question[] = next;
        for (let d = 0; d < path.length; d++) {
          const idx = path[d];
          const node = arr[idx];
          const subs = [...(node.subQuestions ?? [])];
          arr[idx] = { ...node, subQuestions: subs };
          arr = subs;
        }
        arr.push(newQ);
        return { ...sec, questions: next };
      })
    );
  }

  function deleteQuestion(sectionIdx: number, path: number[]) {
    setSections((prev) =>
      prev.map((sec, i) => {
        if (i !== sectionIdx) return sec;
        const next = [...sec.questions];
        if (path.length === 1) {
          next.splice(path[0], 1);
          next.forEach((q, idx) => (q.order = idx));
          return { ...sec, questions: next };
        }
        let arr: Question[] = next;
        for (let d = 0; d < path.length - 1; d++) {
          const idx = path[d];
          const node = arr[idx];
          const subs = [...(node.subQuestions ?? [])];
          arr[idx] = { ...node, subQuestions: subs };
          arr = subs;
        }
        const leaf = path[path.length - 1];
        arr.splice(leaf, 1);
        arr.forEach((q, idx) => (q.order = idx));
        return { ...sec, questions: next };
      })
    );
  }

  function addOption(sectionIdx: number, path: number[]) {
    updateQuestion(sectionIdx, path, (q) => {
      const options = [...(q.options ?? [])];
      options.push(`Option ${options.length + 1}`);
      return { ...q, options };
    });
  }
  function updateOption(sectionIdx: number, path: number[], optIndex: number, value: string) {
    updateQuestion(sectionIdx, path, (q) => {
      const options = [...(q.options ?? [])];
      options[optIndex] = value;
      return { ...q, options };
    });
  }
  function removeOption(sectionIdx: number, path: number[], optIndex: number) {
    updateQuestion(sectionIdx, path, (q) => {
      const options = [...(q.options ?? [])];
      options.splice(optIndex, 1);
      return { ...q, options };
    });
  }

  // S3 presign upload (same as create)
  async function handleFileInput(sectionIdx: number, path: number[], files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    let ct = file.type || "";
    if (ct === "image/jpg") ct = "image/jpeg";
    if (!ct) ct = "application/octet-stream";

    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: ct }),
    });
    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => null);
      alert(err?.error || "Failed to prepare upload");
      return;
    }
    const { url, fields, publicUrl } = await presignRes.json();

    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => formData.append(k, String(v)));
    formData.append("Content-Type", ct);
    formData.append("file", file);

    const uploadRes = await fetch(url, { method: "POST", body: formData });
    if (!uploadRes.ok) {
      const txt = await uploadRes.text().catch(() => "");
      console.error("S3 upload failed:", txt);
      alert("Upload failed. Please try again.");
      return;
    }

    updateQuestion(sectionIdx, path, (q) => {
      const atts = [...(q.attachments ?? [])];
      atts.push({ filename: file.name, url: publicUrl, mimeType: ct });
      return { ...q, attachments: atts };
    });
  }

  function removeAttachment(sectionIdx: number, path: number[], attIndex: number) {
    updateQuestion(sectionIdx, path, (q) => {
      const atts = [...(q.attachments ?? [])];
      atts.splice(attIndex, 1);
      return { ...q, attachments: atts };
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

  function buildPayloadQuestion(q: Question, order: number): any {
    return {
      text: q.text,
      description: q.description || null,
      helperText: q.helperText || null,
      type: q.type,
      required: q.required,
      order,
      options: q.type === "radio" ? q.options : null,
      attachments:
        q.attachments?.map((a) =>
          a.url ? { url: a.url } : { filename: a.filename, data: a.data, mimeType: a.mimeType }
        ) ?? [],
      validation: q.validation || null,
      subQuestions: q.subQuestions?.map((sq, idx) => buildPayloadQuestion(sq, idx)) ?? [],
    };
  }

  async function handleSave() {
    // require at least one question anywhere
    const hasAtLeastOne = sections.some((s) => (s.questions?.length ?? 0) > 0);
    const qErr = !hasAtLeastOne;
    setErrors({ questions: qErr });
    if (qErr) return;

    // validate
    const allTop = sections.flatMap((s) => s.questions ?? []);
    if (!validateQuestionsTree(allTop)) {
      alert("Ensure all questions have text and radio questions have at least 2 options.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim() || "Questionnaire",
        description,
        // keep a single 'section' for backend symmetry with create
        sections: sections.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          questions: s.questions.map((q, i) => buildPayloadQuestion(q, i)),
        })),
      };

      const res = await fetch(`/api/administration/questionnaire-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("[EditTemplate] backend error", err);
        alert(err?.error || "Failed to save questionnaire");
        return;
      }

      router.push(`/administration/questionnaires/${templateId}`);
    } catch (e) {
      console.error("[EditTemplate] exception", e);
      alert("Error saving template");
    } finally {
      setSaving(false);
    }
  }

  /* ====== UI ====== */
  if (loading) {
    return <div className="container mx-auto p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Questionnaire Template</h1>
          <Link href={`/administration/questionnaires/${templateId}`}>
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">View</button>
          </Link>
        </div>

        {categoryName && (
          <div className="mb-6 flex items-center gap-2">
            <span className="text-sm text-gray-600">Category:</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {categoryName}
            </span>
          </div>
        )}

        {/* Meta */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter template name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Optional description"
            />
          </div>
        </div>

        {sections.map((section, sectionIdx) => (
          <div key={section.id} className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">{section.name}</h2>
              <button
                type="button"
                onClick={() => addQuestionToSection(sectionIdx)}
                className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 flex items-center gap-2"
              >
                <span>+ Add Question</span>
              </button>
            </div>

            {section.questions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">No questions in this section yet</p>
                <button
                  type="button"
                  onClick={() => addQuestionToSection(sectionIdx)}
                  className="mt-3 text-teal-600 hover:text-teal-700 font-medium"
                >
                  Add your first question
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {section.questions.map((q, qIdx) => (
                  <QuestionEditor
                    key={q.id}
                    q={q}
                    path={[qIdx]}
                    sectionIndex={sectionIdx}
                    parentOptions={undefined}
                    updateQuestion={updateQuestion}
                    insertSubQuestion={insertSubQuestion}
                    deleteQuestion={deleteQuestion}
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
        ))}

        {errors.questions && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            At least one question is required
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-gray-400"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
