// app/administration/questionnaires/new/QuestionnaireFormClient.tsx
"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Upload, X, FileText, Info } from "lucide-react";

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
  conditionalOn?: string;  // ⬅️ which parent option reveals this question
  helperText?: string;
  sectionId?: string;
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
];

type QuestionEditorProps = {
  q: Question;
  path: number[];
  sectionIndex: number;
  questionTypes: typeof questionTypes;
  updateQuestion: (
    sectionIdx: number,
    path: number[],
    updater: (q: Question) => Question
  ) => void;
  insertSubQuestion: (sectionIdx: number, path: number[]) => void;
  deleteQuestion: (sectionIdx: number, path: number[]) => void;
  addOption: (sectionIdx: number, path: number[]) => void;
  updateOption: (
    sectionIdx: number,
    path: number[],
    optIndex: number,
    value: string
  ) => void;
  removeOption: (sectionIdx: number, path: number[], optIndex: number) => void;
  handleFileInput: (
    sectionIdx: number,
    path: number[],
    files: FileList | null
  ) => Promise<void> | void;
  removeAttachment: (sectionIdx: number, path: number[], attIndex: number) => void;

  // ⬇️ NEW: parent’s radio options (if this is a sub-question under a radio)
  parentOptions?: string[];
};

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  q,
  path,
  sectionIndex,
  questionTypes,
  updateQuestion,
  insertSubQuestion,
  deleteQuestion,
  addOption,
  updateOption,
  removeOption,
  handleFileInput,
  removeAttachment,
  parentOptions,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const getQuestionNumber = () => path.map((p) => p + 1).join(".");

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 hover:bg-gray-100 rounded"
            >
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
                onChange={(e) =>
                  updateQuestion(sectionIndex, path, (x) => ({
                    ...x,
                    text: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                placeholder="Enter question text"
              />

              <textarea
                value={q.description ?? ""}
                onChange={(e) =>
                  updateQuestion(sectionIndex, path, (x) => ({
                    ...x,
                    description: e.target.value,
                  }))
                }
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                rows={2}
              />

              <textarea
                value={q.helperText ?? ""}
                onChange={(e) =>
                  updateQuestion(sectionIndex, path, (x) => ({
                    ...x,
                    helperText: e.target.value,
                  }))
                }
                placeholder="Helper text with instructions (e.g., 'Please download the attached document and read carefully')"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3"
                rows={2}
              />

              {/* ⬇️ Conditional visibility selector if this is under a radio parent */}
              {parentOptions && parentOptions.length > 0 && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Show this question when parent answer is:
                  </label>
                  <select
                    value={q.conditionalOn ?? ""}
                    onChange={(e) =>
                      updateQuestion(sectionIndex, path, (x) => ({
                        ...x,
                        conditionalOn: e.target.value || undefined,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">-- Always show (no condition) --</option>
                    {parentOptions.map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    This sub-question will appear only when the parent radio equals the selected option.
                  </p>
                </div>
              )}
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
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Type
              </label>
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
                          : ["Yes", "No"] // better default for conditionals
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
                  onChange={(e) =>
                    updateQuestion(sectionIndex, path, (x) => ({
                      ...x,
                      required: e.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  Required
                </span>
              </label>
            </div>
          </div>

          {q.type === "radio" && (
            <div className="mb-3 p-3 bg-gray-50 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Options
              </div>
              {(q.options || []).map((opt, oi) => (
                <div key={oi} className="flex gap-2 items-center mb-2">
                  <input
                    value={opt}
                    onChange={(e) =>
                      updateOption(sectionIndex, path, oi, e.target.value)
                    }
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

          {/* Question Attachments */}
          <div className="mb-3 p-3 bg-blue-50 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Question Attachments
              </span>
              <Info size={14} className="text-gray-400" />
            </div>

            {q.attachments && q.attachments.length > 0 && (
              <div className="space-y-2 mb-2">
                {q.attachments.map((att, ai) => (
                  <div
                    key={ai}
                    className="flex items-center justify-between bg-white p-2 rounded border border-gray-200"
                  >
                    <span className="text-sm text-gray-600 truncate">
                      {att.filename}
                    </span>
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

          {q.subQuestions && q.subQuestions.length > 0 && (
            <div className="pl-4 border-l-2 border-blue-300 mt-4 space-y-3">
              <div className="text-sm font-medium text-blue-600 mb-2">
                Conditional Sub-Questions
              </div>
              {q.subQuestions.map((sq, si) => (
                <QuestionEditor
                  key={sq.id}
                  q={sq}
                  path={[...path, si]}
                  sectionIndex={sectionIndex}
                  questionTypes={questionTypes}
                  updateQuestion={updateQuestion}
                  insertSubQuestion={insertSubQuestion}
                  deleteQuestion={deleteQuestion}
                  addOption={addOption}
                  updateOption={updateOption}
                  removeOption={removeOption}
                  handleFileInput={handleFileInput}
                  removeAttachment={removeAttachment}
                  // ⬇️ Pass parent radio options down so each child can choose a trigger
                  parentOptions={q.type === "radio" ? (q.options || []) : []}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default function QuestionnaireFormClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams?.get("categoryId") ?? null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({ name: false, questions: false });

  function generateTemplateName(fallback = "Questionnaire") {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${fallback} - ${yyyy}-${mm}-${dd}`;
  }

  React.useEffect(() => {
    async function fetchCategory() {
      if (!categoryId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/administration/questionnaire-categories/${categoryId}`);
        const data = res.ok ? await res.json() : { id: categoryId, name: "Category" };
        setCategoryName(data.name || "Unknown Category");
        setSections([
          {
            id: data.id ?? String(categoryId),
            name: data.name ?? "Category",
            order: 0,
            questions: [],
          },
        ]);
      } catch (err) {
        console.error("Failed to fetch category:", err);
        setSections([{ id: String(categoryId), name: "Category", order: 0, questions: [] }]);
      } finally {
        setLoading(false);
      }
    }
    fetchCategory();
  }, [categoryId]);

  const generateId = (prefix = "q") =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      sectionId: base.id,
    };

    setSections((prev) =>
      prev.map((sec, i) =>
        i === sectionIndex ? { ...sec, questions: [...(sec.questions ?? []), newQuestion] } : sec
      )
    );

    setErrors((prev) => ({ ...prev, questions: false }));
  }

  function updateQuestion(
    sectionIdx: number,
    path: number[],
    updater: (q: Question) => Question
  ) {
    setSections((prev) =>
      prev.map((sec, i) => {
        if (i !== sectionIdx) return sec;

        const nextQuestions = [...sec.questions];
        let refArr: Question[] = nextQuestions;
        for (let d = 0; d < path.length - 1; d++) {
          const idx = path[d];
          const node = refArr[idx];
          const clonedSubs = [...(node.subQuestions ?? [])];
          refArr[idx] = { ...node, subQuestions: clonedSubs };
          refArr = clonedSubs;
        }
        const leafIndex = path[path.length - 1];
        refArr[leafIndex] = updater(refArr[leafIndex]);

        return { ...sec, questions: nextQuestions };
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
      // conditionalOn: will be set if parent is radio below
    };

    setSections((prev) =>
      prev.map((sec, i) => {
        if (i !== sectionIdx) return sec;

        const nextQuestions = [...sec.questions];
        let refArr: Question[] = nextQuestions;

        for (let d = 0; d < path.length; d++) {
          const idx = path[d];
          const node = refArr[idx];
          const clonedSubs = [...(node.subQuestions ?? [])];
          refArr[idx] = { ...node, subQuestions: clonedSubs };
          refArr = clonedSubs;

          // If at the parent node, default conditionalOn if parent is a radio
          if (d === path.length - 1) {
            const parentNode = node;
            if (parentNode.type === "radio" && (parentNode.options?.length ?? 0) > 0) {
              newQ.conditionalOn = parentNode.options![0];
            }
          }
        }

        refArr.push(newQ);
        return { ...sec, questions: nextQuestions };
      })
    );
  }

  function deleteQuestion(sectionIdx: number, path: number[]) {
    setSections((prev) =>
      prev.map((sec, i) => {
        if (i !== sectionIdx) return sec;

        const nextQuestions = [...sec.questions];

        if (path.length === 1) {
          nextQuestions.splice(path[0], 1);
          nextQuestions.forEach((q, idx) => (q.order = idx));
          return { ...sec, questions: nextQuestions };
        }

        let refArr: Question[] = nextQuestions;
        for (let d = 0; d < path.length - 1; d++) {
          const idx = path[d];
          const node = refArr[idx];
          const clonedSubs = [...(node.subQuestions ?? [])];
          refArr[idx] = { ...node, subQuestions: clonedSubs };
          refArr = clonedSubs;
        }
        const leafIndex = path[path.length - 1];
        refArr.splice(leafIndex, 1);
        refArr.forEach((q, idx) => (q.order = idx));

        return { ...sec, questions: nextQuestions };
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

  async function handleFileInput(sectionIdx: number, path: number[], files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    // normalize jpeg type
    let ct = file.type || "";
    if (ct === "image/jpg") ct = "image/jpeg";
    if (!ct) ct = "application/octet-stream";

    // 1) Presign
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

    // 2) Multipart POST
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

    // 3) Save only URL/mime
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

  async function handleSubmit(e: React.FormEvent | React.MouseEvent) {
    if ("preventDefault" in e) e.preventDefault();
    const hasAtLeastOneQuestion = sections.some((s) => (s.questions?.length ?? 0) > 0);

    let finalName = name.trim();
    if (!finalName) {
      finalName = generateTemplateName(categoryName || "Questionnaire");
      setName(finalName);
    }

    const qErr = !hasAtLeastOneQuestion;
    setErrors({ name: false, questions: qErr });
    if (qErr) return;

    const allQuestions = sections.flatMap((s) => s.questions ?? []);
    if (!validateQuestionsTree(allQuestions)) {
      alert("Ensure all questions have text and radio questions have at least 2 options.");
      return;
    }

    const catIdToSend = categoryId || undefined;
    const catNameToSend = !categoryId ? (categoryName || "Uncategorized") : undefined;

    setSaving(true);
    try {
      const payload: any = {
        name: finalName,
        description,
        sections: sections.map((section) => ({
          id: section.id,
          name: section.name,
          order: section.order,
          questions: section.questions.map((q, idx) => buildPayloadQuestion(q, idx)),
        })),
        ...(catIdToSend ? { categoryId: catIdToSend } : {}),
        ...(catNameToSend ? { categoryName: catNameToSend } : {}),
      };

      const res = await fetch("/api/administration/questionnaire-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to create questionnaire");
        return;
      }

      router.push("/administration/questionnaires");
    } catch (err) {
      console.error("[CreateTemplate] exception", err);
      alert("Error creating template");
    } finally {
      setSaving(false);
    }
  }

  function buildPayloadQuestion(q: Question, order: number) {
    return {
      text: q.text,
      description: q.description || null,
      helperText: q.helperText || null,
      type: q.type,
      required: q.required,
      order,
      options: q.type === "radio" ? q.options : null,
      // ⬇️ Persist conditional rule in `validation`
      validation: q.conditionalOn
        ? { showWhen: { parentOptionEquals: q.conditionalOn } }
        : null,
      attachments:
        q.attachments?.map((a) =>
          a.url
            ? { url: a.url }
            : { filename: a.filename, data: a.data, mimeType: a.mimeType }
        ) ?? [],
      subQuestions: q.subQuestions?.map((sq, idx) => buildPayloadQuestion(sq, idx)) ?? [],
    };
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create New Questionnaire Template
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading category details...</div>
          </div>
        ) : (
          <>
            {categoryName && (
              <div className="mb-6 flex items-center gap-2">
                <span className="text-sm text-gray-600">Category:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {categoryName}
                </span>
              </div>
            )}

            {/* Template meta card — NAME + DESCRIPTION */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name <span className="text-gray-400">(auto-filled if left blank)</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter template name (optional)"
                />
                {errors.name && (
                  <div className="text-red-500 text-sm mt-1">
                    Template name is required
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
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
                  <h2 className="text-xl font-semibold text-gray-800">
                    {section.name}
                  </h2>
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
                        questionTypes={questionTypes}
                        updateQuestion={updateQuestion}
                        insertSubQuestion={insertSubQuestion}
                        deleteQuestion={deleteQuestion}
                        addOption={addOption}
                        updateOption={updateOption}
                        removeOption={removeOption}
                        handleFileInput={handleFileInput}
                        removeAttachment={removeAttachment}
                        // top-level questions have no parent options
                        parentOptions={[]}
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
                onClick={handleSubmit}
                disabled={saving || loading}
                className="px-6 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-gray-400"
              >
                {saving ? "Creating..." : "Create Questionnaire"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
