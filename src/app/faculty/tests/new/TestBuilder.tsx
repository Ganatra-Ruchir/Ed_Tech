"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowDown, ArrowUp, Check, Circle, Copy, Eye, FileText, GripVertical, ListChecks, Plus, Save, Send, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Input, Select, Textarea } from "@/components/Field";
import { Button } from "@/components/Button";

type Question = {
  key: string;
  type: "MCQ" | "SHORT_ANSWER";
  text: string;
  options: string[];
  correctAnswer: string;
  required: boolean;
  points: number;
};

function newQuestion(): Question {
  return { key: crypto.randomUUID(), type: "MCQ", text: "", options: ["", ""], correctAnswer: "", required: true, points: 1 };
}

export function TestBuilder({ batches }: { batches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [questions, setQuestions] = useState<Question[]>([newQuestion()]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const totalPoints = useMemo(() => questions.reduce((sum, q) => sum + q.points, 0), [questions]);

  function updateQuestion(key: string, patch: Partial<Question>) {
    setQuestions((current) => current.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function updateOption(key: string, index: number, value: string) {
    setQuestions((current) => current.map((q) => {
      if (q.key !== key) return q;
      const options = [...q.options];
      const oldValue = options[index];
      options[index] = value;
      return { ...q, options, correctAnswer: q.correctAnswer === oldValue ? value : q.correctAnswer };
    }));
  }

  function addQuestion(afterIndex = questions.length - 1) {
    const question = newQuestion();
    setQuestions((current) => [...current.slice(0, afterIndex + 1), question, ...current.slice(afterIndex + 1)]);
    setActiveKey(question.key);
  }

  function duplicateQuestion(index: number) {
    const copy = { ...questions[index], key: crypto.randomUUID(), options: [...questions[index].options] };
    setQuestions((current) => [...current.slice(0, index + 1), copy, ...current.slice(index + 1)]);
    setActiveKey(copy.key);
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= questions.length) return;
    setQuestions((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  function validate() {
    if (!batchId) return "Select a batch.";
    if (!title.trim()) return "Add a test title.";
    for (const [index, question] of questions.entries()) {
      if (!question.text.trim()) return `Question ${index + 1} needs a title.`;
      if (question.type === "MCQ") {
        const options = question.options.map((option) => option.trim()).filter(Boolean);
        if (options.length < 2) return `Question ${index + 1} needs at least two options.`;
        if (new Set(options).size !== options.length) return `Question ${index + 1} has duplicate options.`;
        if (!question.correctAnswer.trim() || !options.includes(question.correctAnswer.trim())) return `Choose the correct answer for question ${index + 1}.`;
      }
    }
    return null;
  }

  async function handleSubmit(publish: boolean) {
    const validationError = validate();
    setError(validationError);
    if (validationError) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          title: title.trim(),
          description: description.trim() || undefined,
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          publish,
          questions: questions.map((question) => ({
            type: question.type,
            text: question.text.trim(),
            options: question.type === "MCQ" ? question.options.map((option) => option.trim()).filter(Boolean) : undefined,
            correctAnswer: question.correctAnswer.trim() || undefined,
            required: question.required,
            points: question.points,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "The test could not be created.");
        return;
      }
      router.push(`/faculty/tests/${data.test.id}`);
      router.refresh();
    } catch {
      setError("The test could not be created. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Create test"
        description="Build questions, set answer keys, and assign marks."
        actions={<Button variant="secondary" size="sm" onClick={() => setPreview((value) => !value)}>{preview ? <FileText size={14} /> : <Eye size={14} />}{preview ? "Edit form" : "Preview"}</Button>}
      />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div key="preview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <section className="overflow-hidden rounded-md border border-[#dfe3dc] bg-white shadow-sm">
              <div className="h-2 bg-[#ef5b3f]" />
              <div className="p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase text-[#ef5b3f]">Student preview</p>
                <h1 className="mt-2 text-2xl font-semibold text-[#17212b]">{title || "Untitled test"}</h1>
                {description && <p className="mt-2 whitespace-pre-wrap text-sm text-[#667085]">{description}</p>}
                <p className="mt-4 text-xs text-[#667085]">{questions.length} questions · {totalPoints} points</p>
              </div>
            </section>
            {questions.map((question, index) => (
              <Card key={question.key} className="p-5">
                <p className="text-sm font-medium text-[#17212b]">{index + 1}. {question.text || "Untitled question"}{question.required && <span className="ml-1 text-[#ef5b3f]">*</span>}</p>
                <p className="mt-1 text-[11px] text-[#98a2b3]">{question.points} {question.points === 1 ? "point" : "points"}</p>
                {question.type === "MCQ" ? (
                  <div className="mt-4 space-y-3">
                    {question.options.map((option, optionIndex) => <div key={optionIndex} className="flex items-center gap-3 text-sm text-[#475467]"><Circle size={16} className="text-[#98a2b3]" /> {option || `Option ${optionIndex + 1}`}</div>)}
                  </div>
                ) : <div className="mt-5 border-b border-[#98a2b3] pb-2 text-sm text-[#98a2b3]">Short-answer text</div>}
              </Card>
            ))}
          </motion.div>
        ) : (
          <motion.div key="editor" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <section className="overflow-hidden rounded-md border border-[#dfe3dc] bg-white shadow-sm">
              <div className="h-2 bg-[#ef5b3f]" />
              <div className="space-y-4 p-5 sm:p-6">
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Untitled test" aria-label="Test title" className="border-0 border-b border-[#dfe3dc] !rounded-none px-0 text-xl font-semibold shadow-none focus:!border-[#ef5b3f] focus:!ring-0" />
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Test description (optional)" aria-label="Test description" rows={2} className="resize-none" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-[#475467]">Batch<Select value={batchId} onChange={(event) => setBatchId(event.target.value)} className="mt-1.5">{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</Select></label>
                  <label className="text-xs font-medium text-[#475467]">Due date<Input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-1.5" /></label>
                </div>
              </div>
            </section>

            {questions.map((question, index) => {
              const active = activeKey === question.key;
              return (
                <motion.section layout key={question.key} onFocusCapture={() => setActiveKey(question.key)} onClick={() => setActiveKey(question.key)} className={`relative rounded-md border bg-white shadow-sm transition-colors ${active ? "border-[#ef5b3f]" : "border-[#dfe3dc]"}`}>
                  {active && <span className="absolute inset-y-0 left-0 w-1 rounded-l-md bg-[#ef5b3f]" />}
                  <div className="flex justify-center py-1 text-[#b4bbb2]"><GripVertical size={18} /></div>
                  <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                    <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
                      <Input value={question.text} onChange={(event) => updateQuestion(question.key, { text: event.target.value })} placeholder={`Question ${index + 1}`} aria-label={`Question ${index + 1} text`} className="bg-[#f7f8f5]" />
                      <Select value={question.type} onChange={(event) => updateQuestion(question.key, { type: event.target.value as Question["type"], correctAnswer: event.target.value === "MCQ" ? question.correctAnswer : "" })} aria-label={`Question ${index + 1} type`}>
                        <option value="MCQ">Multiple choice</option><option value="SHORT_ANSWER">Short answer</option>
                      </Select>
                    </div>

                    {question.type === "MCQ" ? (
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => {
                          const isAnswer = Boolean(option.trim()) && question.correctAnswer === option;
                          return (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <button type="button" title="Mark as correct answer" aria-label={`Mark option ${optionIndex + 1} as correct`} onClick={() => option.trim() && updateQuestion(question.key, { correctAnswer: option })} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isAnswer ? "bg-emerald-100 text-emerald-700" : "text-[#98a2b3] hover:bg-[#f4f5f0]"}`}>{isAnswer ? <Check size={15} /> : <Circle size={16} />}</button>
                              <Input value={option} onChange={(event) => updateOption(question.key, optionIndex, event.target.value)} placeholder={`Option ${optionIndex + 1}`} aria-label={`Option ${optionIndex + 1}`} className="border-0 border-b border-[#dfe3dc] !rounded-none px-1 shadow-none focus:!border-[#ef5b3f] focus:!ring-0" />
                              {question.options.length > 2 && <button type="button" title="Remove option" aria-label={`Remove option ${optionIndex + 1}`} onClick={() => updateQuestion(question.key, { options: question.options.filter((_, currentIndex) => currentIndex !== optionIndex), correctAnswer: question.correctAnswer === option ? "" : question.correctAnswer })} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#98a2b3] hover:bg-rose-50 hover:text-rose-600"><X size={15} /></button>}
                            </div>
                          );
                        })}
                        <button type="button" onClick={() => updateQuestion(question.key, { options: [...question.options, ""] })} className="ml-9 inline-flex items-center gap-1 text-xs font-medium text-[#d9472e] hover:underline"><Plus size={13} /> Add option</button>
                        <p className="ml-9 text-[11px] text-[#667085]">Select the circle beside an option to set the answer key.</p>
                      </div>
                    ) : (
                      <div>
                        <div className="border-b border-[#98a2b3] pb-2 text-sm text-[#98a2b3]">Short-answer text</div>
                        <Input value={question.correctAnswer} onChange={(event) => updateQuestion(question.key, { correctAnswer: event.target.value })} placeholder="Reference answer for faculty (optional)" className="mt-3" />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-1 border-t border-[#eceee9] pt-3">
                      <label className="mr-auto flex items-center gap-2 text-xs font-medium text-[#475467]">Points<Input type="number" min={1} max={100} value={question.points} onChange={(event) => updateQuestion(question.key, { points: Math.min(100, Math.max(1, Number(event.target.value) || 1)) })} className="h-8 w-16" /></label>
                      <button type="button" title="Move up" aria-label="Move question up" disabled={index === 0} onClick={() => moveQuestion(index, -1)} className="flex h-8 w-8 items-center justify-center rounded-md text-[#667085] hover:bg-[#f4f5f0] disabled:opacity-30"><ArrowUp size={15} /></button>
                      <button type="button" title="Move down" aria-label="Move question down" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-[#667085] hover:bg-[#f4f5f0] disabled:opacity-30"><ArrowDown size={15} /></button>
                      <button type="button" title="Duplicate" aria-label="Duplicate question" onClick={() => duplicateQuestion(index)} className="flex h-8 w-8 items-center justify-center rounded-md text-[#667085] hover:bg-[#f4f5f0]"><Copy size={15} /></button>
                      <button type="button" title="Delete" aria-label="Delete question" disabled={questions.length === 1} onClick={() => { setQuestions((current) => current.filter((q) => q.key !== question.key)); setActiveKey(null); }} className="flex h-8 w-8 items-center justify-center rounded-md text-[#667085] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 size={15} /></button>
                      <span className="mx-1 h-5 w-px bg-[#dfe3dc]" />
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#475467]">Required<input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(question.key, { required: event.target.checked })} className="peer sr-only" /><span className="relative h-5 w-9 rounded-full bg-[#d0d5dd] transition-colors peer-checked:bg-[#ef5b3f] after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" /></label>
                    </div>
                  </div>
                </motion.section>
              );
            })}

            <button type="button" onClick={() => addQuestion()} className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#b8c0b5] bg-white px-4 py-3 text-sm font-semibold text-[#475467] transition-colors hover:border-[#ef5b3f] hover:text-[#d9472e]"><Plus size={16} /> Add question</button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#dfe3dc] bg-white/95 px-4 py-3 shadow-[0_10px_30px_rgba(23,33,43,0.1)] backdrop-blur">
        <p className="flex items-center gap-2 text-xs text-[#667085]"><ListChecks size={14} /> {questions.length} questions · {totalPoints} points</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleSubmit(false)} disabled={submitting}><Save size={14} /> Save draft</Button>
          <Button onClick={() => handleSubmit(true)} disabled={submitting}><Send size={14} /> Publish</Button>
        </div>
      </div>
    </div>
  );
}
