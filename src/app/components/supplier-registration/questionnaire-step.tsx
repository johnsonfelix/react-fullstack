// app/components/QuestionnaireStep.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch, useController } from "react-hook-form";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";

/* =========================
   Types
   ========================= */
type QuestionType = "text" | "number" | "boolean" | "radio" | "textarea" | "file";

type ValidationShowWhen = {
  parentOptionEquals?: string;
};

interface QQuestion {
  id: string;
  text: string;
  description?: string | null;
  type: QuestionType;
  required?: boolean;
  options?: any;
  parentQuestionId?: string | null;
  categoryName?: string | null;
  templateId?: string;
  order?: number;
  attachments?: string[];
  subQuestions?: QQuestion[];
  validation?: {
    showWhen?: ValidationShowWhen;
  } | null;
}

interface TemplateShape {
  id: string;
  name: string;
  description?: string | null;
  questions: QQuestion[];
}

interface CategoryShape {
  id: string;
  name: string;
  order?: number;
  templates: TemplateShape[];
}

/* =========================
   Helper: simple array equality
   ========================= */
const arraysEqual = (a: any[] = [], b: any[] = []) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (String(a[i]) !== String(b[i])) return false;
  return true;
};

/* =========================
   QuestionNode (memoized)
   - watches only its own answer and its parent's answer (if any).
   - does not re-render for unrelated changes.
   ========================= */
type QuestionNodeProps = {
  q: QQuestion;
  control: any;
  setValue: (name: string, value: any, opts?: any) => void;
  getFieldName: (qId: string) => string;
  answers: Record<string, any>;
  errors: Record<string, any>;
};

const QuestionNodeInner: React.FC<QuestionNodeProps> = ({ q, control, setValue, getFieldName, answers, errors }) => {
  // watch only this field's value
  const fieldName = getFieldName(q.id);
  const watchedValue = useWatch({ control, name: fieldName, defaultValue: answers?.[q.id] ?? (q.type === "boolean" ? false : "") });

  // watch parent value only if parent exists (undefined name is not passed)
  const parentName = q.parentQuestionId ? getFieldName(q.parentQuestionId) : undefined;
  const parentValue = q.parentQuestionId ? useWatch({ control, name: parentName }) : undefined;

  // compute visibility based on parent rule (only depends on parentValue)
  const isQuestionVisible = (qq: QQuestion) => {
    if (!qq.parentQuestionId) return true;
    const rule = qq.validation?.showWhen;
    if (rule?.parentOptionEquals !== undefined) {
      return String(parentValue) === String(rule.parentOptionEquals);
    }
    return true;
  };

  const visible = isQuestionVisible(q);
  if (!visible) return null;

  const error = (errors as any)?.questionnaire?.[q.id];

  const { field } = useController({
    name: fieldName,
    control,
    defaultValue: answers?.[q.id] ?? (q.type === "boolean" ? false : ""),
  });

  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFileUploadLocal(file: File) {
    let contentType = file.type || "application/octet-stream";
    if (contentType === "image/jpg") contentType = "image/jpeg";

    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType }),
    });
    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => null);
      throw new Error(err?.error || "Failed to prepare upload");
    }
    const { url, fields, publicUrl } = await presignRes.json();

    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => formData.append(k, String(v)));
    formData.append("Content-Type", contentType);
    formData.append("file", file);

    const uploadRes = await fetch(url, { method: "POST", body: formData });
    if (!uploadRes.ok) {
      const txt = await uploadRes.text().catch(() => "");
      throw new Error(`S3 upload failed: ${txt || uploadRes.statusText}`);
    }

    // set form value
    setValue(fieldName, publicUrl, { shouldDirty: true, shouldValidate: false });
    field.onChange(publicUrl);
    return publicUrl;
  }

  function markFileForDeletionLocal(url: string) {
    if (!url) return;
    const current = ( ( (control?.getValues && control.getValues()?.questionnaire?.__filesToDelete) ?? [] ) as string[] ) ?? [];
    if (!Array.isArray(current)) {
      setValue("questionnaire.__filesToDelete", [url], { shouldDirty: true });
      return;
    }
    if (!current.includes(url)) {
      setValue("questionnaire.__filesToDelete", [...current, url], { shouldDirty: true });
    }
  }

  const commonHeader = (
    <>
      {q.type !== "boolean" && (
        <Label>
          {q.text}
          {q.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {q.description && <p className="text-sm text-gray-500 mt-1">{q.description}</p>}
      {q.attachments && q.attachments.length > 0 && (
        <div className="mt-2 space-y-1">
          {q.attachments.map((u, i) => (
            <a key={`${q.id}-att-${i}`} href={u} target="_blank" rel="noreferrer" className="text-sm underline text-blue-600">
              Attachment {i + 1}
            </a>
          ))}
        </div>
      )}
    </>
  );

  let fieldUI: React.ReactNode = null;

  switch (q.type) {
    case "boolean":
      fieldUI = (
        <div className="space-y-1">
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} className="form-checkbox h-4 w-4" />
            <span>{q.text}{q.required && <span className="text-red-500 ml-1">*</span>}</span>
          </label>
          {q.description && <p className="text-sm text-gray-500 ml-6">{q.description}</p>}
        </div>
      );
      break;

    case "radio":
      fieldUI = (
        <div className="space-y-2">
          {commonHeader}
          <div className="mt-2 space-y-1">
            {Array.isArray(q.options) && q.options.map((opt: any) => {
              const valStr = String(opt);
              return (
                <label key={valStr} className="flex items-center space-x-2">
                  <input type="radio" checked={String(field.value) === valStr} onChange={() => field.onChange(valStr)} />
                  <span>{valStr}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
      break;

    case "textarea":
      fieldUI = (
        <div className="space-y-2">
          {commonHeader}
          <textarea rows={4} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} className="w-full rounded-md border px-3 py-2" />
        </div>
      );
      break;

    case "number":
      fieldUI = (
        <div className="space-y-2">
          {commonHeader}
          <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
        </div>
      );
      break;

    case "file":
      fieldUI = (
        <div className="space-y-2">
          {commonHeader}

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={async (e) => {
              const inputEl = fileRef.current;
              const file = e.target.files?.[0];
              if (!file) return;
              const previousValue = field.value ? String(field.value) : "";
              try {
                const url = await handleFileUploadLocal(file);
                field.onChange(url);
                if (previousValue && !previousValue.startsWith("/")) markFileForDeletionLocal(previousValue);
              } catch (err: any) {
                console.error(err);
                alert(err?.message || "Upload failed. Please try again.");
              } finally {
                if (inputEl) inputEl.value = "";
              }
            }}
          />

          {field.value ? (
            <div className="flex items-center gap-3">
              <a href={String(field.value)} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">View uploaded file</a>
              <button type="button" className="text-sm px-2 py-1 rounded bg-gray-200 hover:bg-gray-300" onClick={() => fileRef.current?.click()}>Replace</button>
              <button type="button" className="text-sm px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200" onClick={() => {
                const existing = field.value ? String(field.value) : "";
                if (existing && !existing.startsWith("/")) markFileForDeletionLocal(existing);
                field.onChange("");
                setValue(fieldName, "", { shouldDirty: true, shouldValidate: false });
              }}>
                Remove
              </button>
            </div>
          ) : (
            <button type="button" className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm" onClick={() => fileRef.current?.click()}>Upload file</button>
          )}
        </div>
      );
      break;

    case "text":
    default:
      fieldUI = (
        <div className="space-y-2">
          {commonHeader}
          <Input value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
        </div>
      );
      break;
  }

  return (
    <div className="p-3 border rounded">
      {fieldUI}
      {error && <p className="text-sm text-red-500 mt-1">This field is required</p>}

      {q.subQuestions && q.subQuestions.length > 0 && (
        <div className="pl-4 border-l mt-4 space-y-3">
          {q.subQuestions.map((child) => (
            <QuestionNode key={child.id} q={child} control={control} setValue={setValue} getFieldName={getFieldName} answers={answers} errors={errors} />
          ))}
        </div>
      )}
    </div>
  );
};

// Memoized wrapper to avoid re-renders when parent updates unrelated fields
const QuestionNode = React.memo(QuestionNodeInner, (prev, next) => {
  // shallow compare id (questions are stable references in your categories)
  if (prev.q.id !== next.q.id) return false;
  // if the question object changed identity, re-render
  if (prev.q !== next.q) return false;
  // errors change -> re-render if relevant error changed
  const prevErr = (prev.errors as any)?.questionnaire?.[prev.q.id];
  const nextErr = (next.errors as any)?.questionnaire?.[next.q.id];
  if (prevErr !== nextErr) return false;
  return true;
});

/* =========================
   Main component
   ========================= */
export default function QuestionnaireStep() {
  const {
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useFormContext();

  const verifiedEmail = useWatch({ control, name: "verifiedEmail" });

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryShape[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // watch whole questionnaire only for completion calculations (parent uses it)
  const questionnaireValues = useWatch({
    control,
    name: "questionnaire",
    defaultValue: {},
  }) as Record<string, any>;

  useEffect(() => {
    let mounted = true;
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const url = verifiedEmail
          ? `/api/supplier-registration/questionnaire?email=${encodeURIComponent(verifiedEmail)}`
          : `/api/supplier-registration/questionnaire`;

        const res = await fetch(url);
        if (!res.ok) {
          console.error("Failed to fetch questionnaire template", await res.text());
          return;
        }
        const data = await res.json();
        if (!mounted) return;

        const cats = (data.categories || []) as CategoryShape[];
        setCategories(cats);

        if (cats.length > 0) {
          setActiveCategoryId((prev) => prev ?? cats[0].id);
          const firstTemplate = cats[0].templates?.[0];
          setActiveTemplateId((prev) => prev ?? (firstTemplate ? firstTemplate.id : null));
        }

        const initialAnswers = data.answers || {};
        setAnswers(initialAnswers);

        // Seed RHF once without marking dirty
        Object.keys(initialAnswers).forEach((qid) => {
          setValue(`questionnaire.${qid}`, initialAnswers[qid], {
            shouldDirty: false,
            shouldValidate: false,
          });
        });

        // Ensure __filesToDelete array exists
        setValue("questionnaire.__filesToDelete", [], { shouldDirty: false });
      } catch (err) {
        console.error("Failed to load questionnaire template:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTemplate();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedEmail, setValue]);

  /* =========================
     Visibility helpers (use local helpers inside parent)
     ========================= */
  const getFieldName = (qId: string) => `questionnaire.${qId}`;

  const isQuestionVisibleTop = (q: QQuestion, values: Record<string, any>) => {
    if (!q.parentQuestionId) return true;
    const rule = q.validation?.showWhen;
    if (rule?.parentOptionEquals !== undefined) {
      const parentVal = values?.[q.parentQuestionId];
      return String(parentVal) === String(rule.parentOptionEquals);
    }
    return true;
  };

  const flattenVisible = (qs: QQuestion[] | undefined, values: Record<string, any>): QQuestion[] => {
    if (!qs || qs.length === 0) return [];
    const out: QQuestion[] = [];
    for (const q of qs) {
      if (!isQuestionVisibleTop(q, values)) continue;
      out.push(q);
      if (q.subQuestions && q.subQuestions.length) {
        out.push(...flattenVisible(q.subQuestions, values));
      }
    }
    return out;
  };

  const visibleByCategory = useMemo(() => {
    const map: Record<string, QQuestion[]> = {};
    for (const cat of categories) {
      const allQs: QQuestion[] = [];
      for (const t of cat.templates || []) {
        allQs.push(...flattenVisible(t.questions, questionnaireValues));
      }
      map[cat.id] = allQs;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, JSON.stringify(questionnaireValues)]);

  function isAnswered(qType: string | undefined, val: any) {
    if (qType === "boolean") return val === true || val === false;
    if (val === undefined || val === null) return false;
    if (qType === "number") {
      if (val === "") return false;
      const n = Number(val);
      return !Number.isNaN(n);
    }
    if (typeof val === "string") return val.trim().length > 0;
    return Boolean(val);
  }

  const categoryCompletion = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const cat of categories) {
      const qList = visibleByCategory[cat.id] || [];
      if (qList.length === 0) {
        out[cat.id] = false;
        continue;
      }
      let allAnswered = true;
      for (const q of qList) {
        const val = questionnaireValues?.[q.id];
        if (!isAnswered(q.type, val)) {
          allAnswered = false;
          break;
        }
      }
      out[cat.id] = allAnswered;
    }
    return out;
  }, [visibleByCategory, JSON.stringify(questionnaireValues), JSON.stringify(categories.map((c) => c.id))]);

  const allQComplete = useMemo(() => {
    if (!categories.length) return false;
    return categories.every((c) => categoryCompletion[c.id] === true);
  }, [categories, categoryCompletion]);

  useEffect(() => {
    setValue("questionnaire.__allComplete", allQComplete, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [allQComplete, setValue]);

  /* =========================
     Write completed section names -> form once (guarded)
     ========================= */
  const prevWrittenRef = useRef<string[] | null>(null);

  useEffect(() => {
    const completedNames = Object.keys(categoryCompletion)
      .filter((k) => categoryCompletion[k])
      .map((k) => (categories.find((c) => c.id === k)?.name ?? k).toString().trim());

    const normalized = [...completedNames].sort();
    const current = getValues()?.questionnaire?.completedSections ?? [];
    const currentNormalized = Array.isArray(current)
      ? [...current].map(String).sort()
      : [];

    if (arraysEqual(normalized, currentNormalized)) {
      prevWrittenRef.current = normalized;
      return;
    }
    if (prevWrittenRef.current && arraysEqual(prevWrittenRef.current, normalized)) {
      return;
    }

    setValue("questionnaire.completedSections", normalized, {
      shouldDirty: true,
      shouldValidate: false,
    });
    prevWrittenRef.current = normalized;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(categoryCompletion), JSON.stringify(categories.map((c) => `${c.id}|${c.name}`))]);

  /* =========================
     UI
     ========================= */
  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-bold">Questionnaire</h2>
        <p>Loading questionnaire template…</p>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold">Questionnaire</h2>
        <p className="text-gray-500">No questionnaire available at this time.</p>
      </div>
    );
  }

  const activeCategory = categories.find((c) => c.id === activeCategoryId) ?? categories[0];
  const templates = activeCategory.templates || [];
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) ?? templates[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Questionnaire</h2>
        <p className="text-sm text-gray-500 mt-1">Please complete all sections. Required fields are marked with *</p>
      </div>

      <div className="flex gap-4">
        <aside className="w-1/4 space-y-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategoryId(cat.id);
                const firstT = cat.templates?.[0];
                setActiveTemplateId(firstT ? firstT.id : null);
              }}
              className={`w-full p-2 text-left rounded ${activeCategoryId === cat.id ? "bg-primary text-white" : "bg-gray-100"}`}
            >
              <div className="flex justify-between items-center">
                <span>{cat.name}</span>
                <span className="text-xs">{categoryCompletion[cat.id] ? "✓" : ""}</span>
              </div>
            </button>
          ))}
        </aside>

        <main className="flex-1">
          <div className="flex gap-2 mb-4">
            {templates.map((t) => (
              <button key={t.id} type="button" onClick={() => setActiveTemplateId(t.id)} className={`px-3 py-1 rounded ${activeTemplateId === t.id ? "bg-gray-800 text-white" : "bg-gray-200"}`}>
                {t.name}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {activeTemplate && Array.isArray(activeTemplate.questions) && activeTemplate.questions.length > 0 ? (
              activeTemplate.questions.map((q) => (
                <QuestionNode key={q.id} q={q} control={control} setValue={setValue} getFieldName={getFieldName} answers={answers} errors={errors} />
              ))
            ) : (
              <p className="text-gray-500">No questions in this template.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
