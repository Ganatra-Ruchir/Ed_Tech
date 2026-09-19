/** Plain DTOs for faculty office check-in / check-out tracking. UI components
 * type against these rather than Prisma's generated types, so the rest of the
 * app compiles independently of `prisma generate`. Only the server data layer
 * (staff-attendance.ts) touches the StaffAttendance / AttendanceSettings
 * Prisma models. */

export type StaffAttendanceRecordDTO = {
  id: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  isLate: boolean;
};

export type FacultyAttendanceStatusDTO = {
  officeStartTime: string;
  today: StaffAttendanceRecordDTO | null;
  recent: StaffAttendanceRecordDTO[];
};

export type AdminAttendanceRosterRowDTO = {
  facultyId: string;
  facultyName: string;
  facultyImageUrl: string | null;
  isCC: boolean;
  record: StaffAttendanceRecordDTO | null;
};

export type AdminAttendanceRosterDTO = {
  date: string;
  officeStartTime: string;
  rows: AdminAttendanceRosterRowDTO[];
};

export function minutesSinceMidnight(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map((n) => Number.parseInt(n, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function formatClock(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}
