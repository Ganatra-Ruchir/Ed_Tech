/**
 * Small formatting/date helpers shared by the faculty portal's pages and
 * client boards. Kept in `src/components/faculty` (rather than in a route
 * file) because Next.js route files may only export a default component and
 * the handful of framework-reserved config values.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function fmtShortDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/** "10 min ago" / "3 hours ago" / "2 days ago", relative to `reference`. */
export function relativeTime(d: Date | string | null | undefined, reference: number): string {
  if (!d) return "-";
  const diff = reference - new Date(d).getTime();
  if (diff < 60_000) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return fmtDate(d);
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Rolling windows the dashboard compares against each other. Reading the
 * clock lives here so the pages themselves stay declarative — every faculty
 * page that uses it is already fully dynamic (it reads the session cookie).
 */
export function timeWindows() {
  const now = Date.now();
  return {
    now,
    weekAgo: new Date(now - 7 * DAY_MS),
    twoWeeksAgo: new Date(now - 14 * DAY_MS),
    thirtyDaysAgo: new Date(now - 30 * DAY_MS),
    sixtyDaysAgo: new Date(now - 60 * DAY_MS),
    /** Local-midnight start of the day `offset` days before today. */
    dayStart(offset: number): Date {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - offset);
      return d;
    },
  };
}

export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function currentHour(): number {
  return new Date().getHours();
}

/**
 * Percentage change between two counts. Returns null when there is no
 * baseline to compare against, so the UI can omit the delta rather than
 * inventing one.
 */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export const SUBMISSION_STATUSES = ["SUBMITTED", "IN_REVIEW", "NEEDS_REVISION", "APPROVED"] as const;
export type SubmissionStatusName = (typeof SUBMISSION_STATUSES)[number];

export function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export const STATUS_HEX: Record<string, string> = {
  SUBMITTED: "#6366f1",
  IN_REVIEW: "#f59e0b",
  APPROVED: "#10b981",
  NEEDS_REVISION: "#f43f5e",
};

/** "5.7 MB" / "812 KB" / "0 B" — file sizes as stored on SubmissionFile. */
export function fmtFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
