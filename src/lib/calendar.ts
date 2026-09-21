export const CALENDAR_CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "ACADEMIC", label: "Academic" },
  { value: "DEADLINE", label: "Deadline" },
  { value: "EVENT", label: "Event" },
  { value: "HOLIDAY", label: "Holiday" },
] as const;

export type CalendarCategory = (typeof CALENDAR_CATEGORIES)[number]["value"];

export type CalendarEventDTO = {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  category: string;
  createdByName: string;
  createdAt: string;
};

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
