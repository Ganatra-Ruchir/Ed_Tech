"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Input, Select, Textarea } from "@/components/Field";
import { cn } from "@/lib/cn";
import { CALENDAR_CATEGORIES, type CalendarEventDTO } from "@/lib/calendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CATEGORY_STYLE: Record<string, { dot: string; pill: string }> = {
  GENERAL: { dot: "bg-zinc-500", pill: "bg-zinc-100 text-zinc-700" },
  ACADEMIC: { dot: "bg-[#4f72a8]", pill: "bg-[#edf2fa] text-[#345681]" },
  DEADLINE: { dot: "bg-[#d9472e]", pill: "bg-[#fff0ed] text-[#b93825]" },
  EVENT: { dot: "bg-[#4d8b68]", pill: "bg-[#edf7f1] text-[#33704f]" },
  HOLIDAY: { dot: "bg-[#8b78a8]", pill: "bg-[#f4f0fa] text-[#6c598c]" },
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function longDate(value: string) {
  return dateFromKey(value).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function categoryLabel(value: string) {
  return CALENDAR_CATEGORIES.find((category) => category.value === value)?.label ?? "General";
}

type EventForm = {
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  category: string;
};

function emptyForm(eventDate: string): EventForm {
  return { title: "", description: "", eventDate, startTime: "", endTime: "", location: "", category: "GENERAL" };
}

export function UniversityCalendar({
  initialEvents,
  canManage,
}: {
  initialEvents: CalendarEventDTO[];
  canManage: boolean;
}) {
  const today = new Date();
  const todayKey = dateKey(today);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [events, setEvents] = useState(initialEvents);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(() => emptyForm(todayKey));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventDTO[]>();
    for (const event of events) {
      const current = map.get(event.eventDate) ?? [];
      current.push(event);
      map.set(event.eventDate, current);
    }
    return map;
  }, [events]);

  const monthDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const leading = new Date(year, monthIndex, 1).getDay();
    const days = new Date(year, monthIndex + 1, 0).getDate();
    const cells: Array<{ day: number; key: string } | null> = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= days; day += 1) {
      cells.push({ day, key: `${year}-${pad(monthIndex + 1)}-${pad(day)}` });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  function selectDate(value: string) {
    setSelectedDate(value);
    if (canManage) setForm((current) => ({ ...current, eventDate: value }));
  }

  function openCreateForm() {
    setForm(emptyForm(selectedDate));
    setError(null);
    setFormOpen(true);
  }

  async function createEvent(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Add an event title.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          eventDate: form.eventDate,
          startTime: form.startTime || undefined,
          endTime: form.endTime || undefined,
          location: form.location.trim() || undefined,
          category: form.category,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The event could not be created.");
        return;
      }
      const created = data.event as CalendarEventDTO;
      setEvents((current) => [...current, created].sort((a, b) => `${a.eventDate}${a.startTime ?? ""}`.localeCompare(`${b.eventDate}${b.startTime ?? ""}`)));
      setSelectedDate(created.eventDate);
      const createdDate = dateFromKey(created.eventDate);
      setMonth(new Date(createdDate.getFullYear(), createdDate.getMonth(), 1));
      setFormOpen(false);
    } catch {
      setError("The event could not be created. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("Delete this calendar event for everyone?")) return;
    const response = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    if (response.ok) setEvents((current) => current.filter((event) => event.id !== id));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="University Calendar"
        description="Academic dates, deadlines, holidays, and campus events shared across every portal."
        actions={canManage ? <Button size="sm" onClick={openCreateForm}><Plus size={15} /> New event</Button> : undefined}
      />

      {formOpen && canManage && (
        <section className="rounded-md border border-[#dfe3dc] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#17212b]">Create calendar event</h2>
              <p className="mt-0.5 text-xs text-[#667085]">This event will be visible to students, faculty, and administrators.</p>
            </div>
            <button type="button" onClick={() => setFormOpen(false)} aria-label="Close event form" className="flex h-8 w-8 items-center justify-center rounded-md text-[#667085] hover:bg-[#f4f5f0]"><X size={16} /></button>
          </div>
          <form onSubmit={createEvent} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-[#475467]">Title<Input className="mt-1.5" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Event title" maxLength={160} /></label>
              <label className="text-xs font-medium text-[#475467]">Category<Select className="mt-1.5" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CALENDAR_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</Select></label>
              <label className="text-xs font-medium text-[#475467]">Date<Input className="mt-1.5" type="date" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} required /></label>
              <label className="text-xs font-medium text-[#475467]">Location<Input className="mt-1.5" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Campus, room, or online" maxLength={160} /></label>
              <label className="text-xs font-medium text-[#475467]">Start time<Input className="mt-1.5" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
              <label className="text-xs font-medium text-[#475467]">End time<Input className="mt-1.5" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
            </div>
            <label className="block text-xs font-medium text-[#475467]">Description<Textarea className="mt-1.5" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} placeholder="Add useful details for everyone" maxLength={2000} /></label>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create event"}</Button></div>
          </form>
        </section>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-md border border-[#dfe3dc] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e7eae4] px-3 py-3 sm:px-4">
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-md text-[#667085] hover:bg-[#f4f5f0]"><ChevronLeft size={17} /></button>
              <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-md text-[#667085] hover:bg-[#f4f5f0]"><ChevronRight size={17} /></button>
              <button type="button" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); selectDate(todayKey); }} className="ml-1 rounded-md border border-[#dfe3dc] px-2.5 py-1.5 text-xs font-semibold text-[#475467] hover:bg-[#f4f5f0]">Today</button>
            </div>
            <h2 className="text-sm font-semibold text-[#17212b] sm:text-base">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
          </div>
          <div className="grid grid-cols-7 border-b border-[#e7eae4] bg-[#f7f8f5]">
            {WEEKDAYS.map((weekday) => <div key={weekday} className="px-1 py-2 text-center text-[10px] font-semibold uppercase text-[#667085] sm:text-[11px]">{weekday}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((cell, index) => {
              if (!cell) return <div key={`empty-${index}`} className="min-h-20 border-b border-r border-[#eceee9] bg-[#fafbf9] sm:min-h-28" />;
              const dayEvents = eventsByDate.get(cell.key) ?? [];
              const selected = selectedDate === cell.key;
              const isToday = todayKey === cell.key;
              return (
                <button key={cell.key} type="button" onClick={() => selectDate(cell.key)} className={cn("min-h-20 border-b border-r border-[#eceee9] p-1.5 text-left align-top transition-colors sm:min-h-28 sm:p-2", selected ? "bg-[#fff8f5]" : "bg-white hover:bg-[#f7f8f5]")}>
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold", isToday ? "bg-[#ef5b3f] text-white" : "text-[#475467]")}>{cell.day}</span>
                  <span className="mt-1 flex gap-1 sm:hidden">{dayEvents.slice(0, 3).map((event) => <span key={event.id} className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_STYLE[event.category]?.dot ?? CATEGORY_STYLE.GENERAL.dot)} />)}</span>
                  <span className="mt-1 hidden space-y-1 sm:block">{dayEvents.slice(0, 2).map((event) => <span key={event.id} className={cn("block truncate rounded px-1.5 py-1 text-[10px] font-medium", CATEGORY_STYLE[event.category]?.pill ?? CATEGORY_STYLE.GENERAL.pill)}>{event.startTime ? `${event.startTime} ` : ""}{event.title}</span>)}{dayEvents.length > 2 && <span className="block px-1 text-[10px] font-medium text-[#667085]">+{dayEvents.length - 2} more</span>}</span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="rounded-md border border-[#dfe3dc] bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase text-[#d9472e]">Selected day</p>
          <h2 className="mt-1 text-base font-semibold text-[#17212b]">{longDate(selectedDate)}</h2>
          {selectedEvents.length === 0 ? (
            <div className="py-8 text-center"><p className="text-sm font-medium text-[#475467]">No events</p><p className="mt-1 text-xs text-[#98a2b3]">This day is currently clear.</p>{canManage && <Button className="mt-4" size="sm" onClick={openCreateForm}><Plus size={14} /> Add event</Button>}</div>
          ) : (
            <ul className="mt-4 space-y-3">
              {selectedEvents.map((event) => {
                const style = CATEGORY_STYLE[event.category] ?? CATEGORY_STYLE.GENERAL;
                return (
                  <li key={event.id} className="border-l-2 border-[#dfe3dc] pl-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold", style.pill)}>{categoryLabel(event.category)}</span>
                        <p className="mt-1.5 text-sm font-semibold text-[#17212b]">{event.title}</p>
                      </div>
                      {canManage && <button type="button" title="Delete event" aria-label={`Delete ${event.title}`} onClick={() => deleteEvent(event.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#98a2b3] hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>}
                    </div>
                    {(event.startTime || event.endTime) && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#667085]"><Clock3 size={12} /> {event.startTime ?? ""}{event.endTime ? ` - ${event.endTime}` : ""}</p>}
                    {event.location && <p className="mt-1 flex items-center gap-1 text-xs text-[#667085]"><MapPin size={12} /> {event.location}</p>}
                    {event.description && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#475467]">{event.description}</p>}
                    <p className="mt-2 text-[10px] text-[#98a2b3]">Added by {event.createdByName}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
