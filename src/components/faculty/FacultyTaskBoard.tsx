"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check, ChevronRight, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";

type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "COMPLETED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type FacultyTaskDTO = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

const COLUMNS: Array<{ status: TaskStatus; label: string; dot: string; panel: string }> = [
  { status: "TODO", label: "To do", dot: "bg-rose-500", panel: "bg-rose-50/45" },
  { status: "IN_PROGRESS", label: "In progress", dot: "bg-blue-500", panel: "bg-blue-50/45" },
  { status: "REVIEW", label: "Review", dot: "bg-amber-500", panel: "bg-amber-50/45" },
  { status: "COMPLETED", label: "Completed", dot: "bg-emerald-500", panel: "bg-emerald-50/45" },
];

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "bg-emerald-50 text-emerald-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-rose-50 text-rose-700",
};

function nextStatus(status: TaskStatus): TaskStatus | null {
  const index = COLUMNS.findIndex((column) => column.status === status);
  return index >= 0 && index < COLUMNS.length - 1 ? COLUMNS[index + 1].status : null;
}

function dateInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function FacultyTaskBoard({ initialTasks }: { initialTasks: FacultyTaskDTO[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState(() => dateInputValue(new Date()));
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(
    () => Object.fromEntries(COLUMNS.map((column) => [column.status, tasks.filter((task) => task.status === column.status)])) as Record<TaskStatus, FacultyTaskDTO[]>,
    [tasks],
  );

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/faculty/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority, dueDate: dueDate || null }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "The task could not be created.");
      return;
    }
    setTasks((current) => [data.task, ...current]);
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setDueDate(dateInputValue(new Date()));
    setComposerOpen(false);
  }

  async function moveTask(task: FacultyTaskDTO, status: TaskStatus) {
    setBusyId(task.id);
    const response = await fetch(`/api/faculty/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (response.ok) {
      const data = await response.json();
      setTasks((current) => current.map((item) => (item.id === task.id ? data.task : item)));
    }
    setBusyId(null);
  }

  async function deleteTask(id: string) {
    setBusyId(id);
    const response = await fetch(`/api/faculty/tasks/${id}`, { method: "DELETE" });
    if (response.ok) setTasks((current) => current.filter((task) => task.id !== id));
    setBusyId(null);
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f3032]">Personal productivity</p>
          <h2 className="mt-1 text-lg font-bold text-zinc-900">My Tasks</h2>
          <p className="text-xs text-zinc-500">Plan today, track progress, and keep teaching work organized.</p>
        </div>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#8f1834] px-4 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(143,24,52,0.2)] hover:bg-[#741329]"
        >
          <Plus size={15} /> Add task
        </button>
      </div>

      {composerOpen && (
        <form onSubmit={createTask} className="mb-4 rounded-lg border border-[#e4d8d4] bg-white p-4 shadow-[0_14px_38px_rgba(65,35,35,0.08)]">
          <div className="mb-3 flex items-center justify-between">
            <div><h3 className="text-sm font-semibold text-zinc-900">Add a daily task</h3><p className="text-[11px] text-zinc-500">Only you can see tasks on this board.</p></div>
            <button type="button" onClick={() => setComposerOpen(false)} aria-label="Close task form" className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100"><X size={16} /></button>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.3fr)_minmax(260px,2fr)_140px_160px_auto]">
            <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#8f3032]/45 focus:ring-3 focus:ring-[#8f3032]/8" />
            <input maxLength={800} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short note or outcome" className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#8f3032]/45 focus:ring-3 focus:ring-[#8f3032]/8" />
            <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-xs outline-none focus:border-[#8f3032]/45"><option value="LOW">Low priority</option><option value="MEDIUM">Medium priority</option><option value="HIGH">High priority</option></select>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-xs outline-none focus:border-[#8f3032]/45" />
            <button disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#8f1834] px-4 text-xs font-semibold text-white disabled:opacity-60">{saving ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />} Add</button>
          </div>
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        </form>
      )}

      <div className="grid gap-3 lg:grid-cols-4">
        {COLUMNS.map((column) => (
          <div key={column.status} className={cn("min-h-72 rounded-lg border border-zinc-200/80 p-3", column.panel)}>
            <div className="mb-3 flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", column.dot)} />
              <h3 className="text-[12.5px] font-semibold text-zinc-800">{column.label}</h3>
              <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 shadow-sm">{grouped[column.status].length}</span>
            </div>
            <div className="space-y-2">
              {grouped[column.status].length === 0 ? (
                <div className="flex min-h-28 items-center justify-center rounded-md border border-dashed border-zinc-200 bg-white/55 px-3 text-center text-[11px] text-zinc-400">No tasks here</div>
              ) : grouped[column.status].map((task) => {
                const currentStatus = task.status as TaskStatus;
                const followingStatus = nextStatus(currentStatus);
                const taskPriority = task.priority as TaskPriority;
                return (
                  <article key={task.id} className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("line-clamp-2 text-[12.5px] font-semibold text-zinc-900", currentStatus === "COMPLETED" && "text-zinc-500 line-through")}>{task.title}</p>
                      <button type="button" disabled={busyId === task.id} onClick={() => deleteTask(task.id)} title="Delete task" className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 size={12} /></button>
                    </div>
                    {task.description && <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">{task.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold", PRIORITY_STYLE[taskPriority] ?? PRIORITY_STYLE.MEDIUM)}>{task.priority.toLowerCase()}</span>
                      {task.dueDate && <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400"><CalendarDays size={10} /> {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                    </div>
                    {followingStatus && (
                      <button type="button" disabled={busyId === task.id} onClick={() => moveTask(task, followingStatus)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-zinc-200 py-1.5 text-[10px] font-semibold text-zinc-600 hover:border-[#8f3032]/25 hover:bg-[#8f3032]/[0.04] hover:text-[#8f3032] disabled:opacity-50">
                        {busyId === task.id ? <LoaderCircle size={11} className="animate-spin" /> : followingStatus === "COMPLETED" ? <Check size={11} /> : <ChevronRight size={11} />}
                        Move to {COLUMNS.find((item) => item.status === followingStatus)?.label}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
