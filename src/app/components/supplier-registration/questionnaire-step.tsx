"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";

type QuestionType = "text" | "number" | "boolean" | "radio" | "textarea";

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

export default function QuestionnaireStep() {
  const { register, setValue, getValues, control, formState: { errors } } = useFormContext();
  const verifiedEmail = useWatch({ control, name: "verifiedEmail" }); // optional if you keep verifiedEmail in form

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryShape[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // subscribe to deep questionnaire changes — reliable re-renders on nested changes
  const questionnaireValues = useWatch({ control, name: "questionnaire", defaultValue: {} }) as Record<string, any>;

  // fetch template + saved answers once (or when verifiedEmail changes)
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

        // Seed RHF once (safe in effect)
        Object.keys(initialAnswers).forEach((qid) => {
          const name = `questionnaire.${qid}`;
          // do not mark dirty on seed
          setValue(name, initialAnswers[qid], { shouldDirty: false, shouldValidate: false });
        });
      } catch (err) {
        console.error("Failed to load questionnaire template:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTemplate();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedEmail, setValue]);

  // group questions by category id (pure)
  const questionsByCategory = useMemo(() => {
    const map: Record<string, QQuestion[]> = {};
    for (const cat of categories) {
      const qList: QQuestion[] = [];
      for (const t of cat.templates || []) {
        for (const q of t.questions || []) qList.push(q);
      }
      map[cat.id] = qList;
    }
    return map;
  }, [categories]);

  // compute completion per category (pure, no side-effects)
  const categoryCompletion = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const cat of categories) {
      const qList = questionsByCategory[cat.id] || [];
      if (qList.length === 0) {
        out[cat.id] = false;
        continue;
      }
      let allAnswered = true;
      for (const q of qList) {
        const val = questionnaireValues?.[q.id];
        if (q.type === "boolean") {
          // boolean presence counts; required should be either true or false (we assume seeded default if needed)
          if (q.required && val !== true && val !== false) {
            allAnswered = false;
            break;
          }
        } else {
          if (val === undefined || val === null || String(val).trim() === "") {
            allAnswered = false;
            break;
          }
        }
      }
      out[cat.id] = allAnswered;
    }
    return out;
  }, [questionnaireValues, categories, questionsByCategory]);

  // helper to compare arrays (order-sensitive)
  const arraysEqual = (a: string[] = [], b: string[] = []) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  };

  // prevWrittenRef to avoid repeated writes from effect
  const prevWrittenRef = useRef<string[] | null>(null);

  // write completed section NAMES into form once they change (guarded to avoid loops)
  useEffect(() => {
    // compute completed section NAMES (trimmed)
    const completedNames = Object.keys(categoryCompletion)
      .filter(k => categoryCompletion[k])
      .map(k => (categories.find(c => c.id === k)?.name ?? k).toString().trim());

    // Normalize ordering to stable sort (so comparison is order-insensitive)
    const normalized = [...completedNames].sort();

    // get current value from the form
    const current = (getValues()?.questionnaire?.completedSections) ?? [];
    const currentNormalized = Array.isArray(current) ? [...current].map(String).sort() : [];

    // if equal, bail out
    if (arraysEqual(normalized, currentNormalized)) {
      prevWrittenRef.current = normalized;
      return;
    }

    // also check prevWrittenRef to avoid duplicate writes
    if (prevWrittenRef.current && arraysEqual(prevWrittenRef.current, normalized)) {
      return;
    }

    // actually write to the form
    setValue("questionnaire.completedSections", normalized, { shouldDirty: true, shouldValidate: false });
    prevWrittenRef.current = normalized;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // trigger when categoryCompletion or categories change meaningfully
    JSON.stringify(categoryCompletion),
    JSON.stringify(categories.map(c => `${c.id}|${c.name}`)),
  ]);

  const renderQuestion = (q: QQuestion) => {
    const fieldName = `questionnaire.${q.id}`;
    const error = (errors as any)?.questionnaire?.[q.id];

    // Use uncontrolled inputs + register + defaultValue/defaultChecked seeded from `answers`
    switch (q.type) {
      case "boolean":
        return (
          <div key={q.id} className="space-y-1">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register(fieldName)}
                defaultChecked={!!answers?.[q.id]}
                className="form-checkbox h-4 w-4"
              />
              <span>{q.text}{q.required && <span className="text-red-500 ml-1">*</span>}</span>
            </label>
            {q.description && <p className="text-sm text-gray-500 ml-6">{q.description}</p>}
            {error && <p className="text-sm text-red-500 ml-6">This field is required</p>}
          </div>
        );
      case "radio":
        return (
          <div key={q.id} className="space-y-2">
            <Label>{q.text}{q.required && <span className="text-red-500 ml-1">*</span>}</Label>
            {q.description && <p className="text-sm text-gray-500">{q.description}</p>}
            <div className="mt-2 space-y-1">
              {Array.isArray(q.options) && q.options.map((opt: any) => (
                <label key={String(opt)} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    {...register(fieldName)}
                    value={opt}
                    defaultChecked={String(answers?.[q.id]) === String(opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-500">This field is required</p>}
          </div>
        );
      case "textarea":
        return (
          <div key={q.id} className="space-y-2">
            <Label>{q.text}{q.required && <span className="text-red-500 ml-1">*</span>}</Label>
            {q.description && <p className="text-sm text-gray-500">{q.description}</p>}
            <textarea
              rows={4}
              {...register(fieldName)}
              defaultValue={answers?.[q.id] ?? ""}
              className="w-full rounded-md border px-3 py-2"
            />
            {error && <p className="text-sm text-red-500">This field is required</p>}
          </div>
        );
      case "number":
        return (
          <div key={q.id} className="space-y-2">
            <Label>{q.text}{q.required && <span className="text-red-500 ml-1">*</span>}</Label>
            {q.description && <p className="text-sm text-gray-500">{q.description}</p>}
            <Input
              type="number"
              {...register(fieldName)}
              defaultValue={answers?.[q.id] ?? ""}
            />
            {error && <p className="text-sm text-red-500">This field is required</p>}
          </div>
        );
      case "text":
      default:
        return (
          <div key={q.id} className="space-y-2">
            <Label>{q.text}{q.required && <span className="text-red-500 ml-1">*</span>}</Label>
            {q.description && <p className="text-sm text-gray-500">{q.description}</p>}
            <Input
              {...register(fieldName)}
              defaultValue={answers?.[q.id] ?? ""}
            />
            {error && <p className="text-sm text-red-500">This field is required</p>}
          </div>
        );
    }
  };

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

  const activeCategory = categories.find(c => c.id === activeCategoryId) ?? categories[0];
  const templates = activeCategory.templates || [];
  const activeTemplate = templates.find(t => t.id === activeTemplateId) ?? templates[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Questionnaire</h2>
        <p className="text-sm text-gray-500 mt-1">Please complete all sections. Required fields are marked with *</p>
      </div>

      <div className="flex gap-4">
        <aside className="w-1/4 space-y-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategoryId(cat.id);
                const firstT = cat.templates?.[0];
                setActiveTemplateId(firstT ? firstT.id : null);
              }}
              className={`w-full p-2 text-left rounded ${activeCategoryId === cat.id ? 'bg-primary text-white' : 'bg-gray-100'}`}
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
            {templates.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTemplateId(t.id)}
                className={`px-3 py-1 rounded ${activeTemplateId === t.id ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {activeTemplate && activeTemplate.questions && activeTemplate.questions.length > 0 ? (
              activeTemplate.questions.map(q => (
                <div key={q.id} className="p-3 border rounded">
                  {renderQuestion(q)}
                </div>
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
