import { prisma } from "@/lib/prisma";
import {
  minutesSinceMidnight,
  parseHHMM,
  type AdminAttendanceRosterDTO,
  type AdminAttendanceRosterRowDTO,
  type FacultyAttendanceStatusDTO,
  type StaffAttendanceRecordDTO,
} from "@/lib/staff-attendance-types";

/**
 * The ONLY module that reads/writes the StaffAttendance and
 * AttendanceSettings Prisma models (faculty office check-in / check-out).
 * Keeping every query here means the rest of the app types against the DTOs
 * in staff-attendance-types.ts and compiles without waiting on
 * `prisma generate`.
 *
 * The explicit type annotations below (RawStaffAttendanceRow / RawFacultyRow)
 * mirror the schema exactly, so once `prisma generate` runs they're checked
 * for real against Prisma's generated types instead of silently widening to
 * `any` -- this file type-checks cleanly both before and after that happens.
 */

const DEFAULT_OFFICE_START = "09:30";
const HISTORY_DAYS = 14;

type RawStaffAttendanceRow = {
  id: string;
  facultyId: string;
  date: Date;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  isLate: boolean;
};

type RawFacultyRow = {
  id: string;
  name: string;
  profileImageUrl: string | null;
  isCC: boolean;
};

function dayStart(d: Date = new Date()): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toDTO(record: RawStaffAttendanceRow): StaffAttendanceRecordDTO {
  return {
    id: record.id,
    date: record.date.toISOString(),
    checkInAt: record.checkInAt ? record.checkInAt.toISOString() : null,
    checkOutAt: record.checkOutAt ? record.checkOutAt.toISOString() : null,
    isLate: record.isLate,
  };
}

/** Reads the singleton office-hours config, seeding it with the default on
 * first read so callers never have to handle a missing row. */
export async function getOfficeStartTime(): Promise<string> {
  const settings: { officeStartTime: string } = await prisma.attendanceSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", officeStartTime: DEFAULT_OFFICE_START },
    update: {},
  });
  return settings.officeStartTime;
}

export async function setOfficeStartTime(
  value: string,
): Promise<{ ok: true; officeStartTime: string } | { ok: false; error: string }> {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return { ok: false, error: "Office start time must be in HH:MM 24-hour format." };
  }
  const settings: { officeStartTime: string } = await prisma.attendanceSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", officeStartTime: value },
    update: { officeStartTime: value },
  });
  return { ok: true, officeStartTime: settings.officeStartTime };
}

export async function getFacultyAttendanceStatus(facultyId: string): Promise<FacultyAttendanceStatusDTO> {
  const officeStartTime = await getOfficeStartTime();
  const today = dayStart();
  const since = dayStart(new Date(today.getTime() - (HISTORY_DAYS - 1) * 24 * 60 * 60 * 1000));

  const records: RawStaffAttendanceRow[] = await prisma.staffAttendance.findMany({
    where: { facultyId, date: { gte: since } },
    orderBy: { date: "desc" },
  });

  const todayRecord = records.find((r) => r.date.getTime() === today.getTime()) ?? null;

  return {
    officeStartTime,
    today: todayRecord ? toDTO(todayRecord) : null,
    recent: records.map(toDTO),
  };
}

export async function checkIn(
  facultyId: string,
): Promise<{ ok: true; record: StaffAttendanceRecordDTO } | { ok: false; error: string }> {
  const today = dayStart();
  const existing: RawStaffAttendanceRow | null = await prisma.staffAttendance.findUnique({
    where: { facultyId_date: { facultyId, date: today } },
  });
  if (existing?.checkInAt) {
    return { ok: false, error: "Already checked in today." };
  }

  const now = new Date();
  const officeStartTime = await getOfficeStartTime();
  const isLate = minutesSinceMidnight(now.toISOString()) > parseHHMM(officeStartTime);

  const record: RawStaffAttendanceRow = await prisma.staffAttendance.upsert({
    where: { facultyId_date: { facultyId, date: today } },
    create: { facultyId, date: today, checkInAt: now, isLate },
    update: { checkInAt: now, isLate },
  });
  return { ok: true, record: toDTO(record) };
}

export async function checkOut(
  facultyId: string,
): Promise<{ ok: true; record: StaffAttendanceRecordDTO } | { ok: false; error: string }> {
  const today = dayStart();
  const existing: RawStaffAttendanceRow | null = await prisma.staffAttendance.findUnique({
    where: { facultyId_date: { facultyId, date: today } },
  });
  if (!existing?.checkInAt) {
    return { ok: false, error: "Check in before checking out." };
  }
  if (existing.checkOutAt) {
    return { ok: false, error: "Already checked out today." };
  }

  const record: RawStaffAttendanceRow = await prisma.staffAttendance.update({
    where: { facultyId_date: { facultyId, date: today } },
    data: { checkOutAt: new Date() },
  });
  return { ok: true, record: toDTO(record) };
}

export async function getAdminAttendanceRoster(dateInput?: string): Promise<AdminAttendanceRosterDTO> {
  const date = dayStart(dateInput ? new Date(dateInput) : new Date());
  const officeStartTime = await getOfficeStartTime();

  const [faculty, records]: [RawFacultyRow[], RawStaffAttendanceRow[]] = await Promise.all([
    prisma.user.findMany({
      where: { role: "FACULTY" },
      select: { id: true, name: true, profileImageUrl: true, isCC: true },
      orderBy: { name: "asc" },
    }),
    prisma.staffAttendance.findMany({ where: { date } }),
  ]);

  const byFaculty = new Map(records.map((r) => [r.facultyId, r]));
  const rows: AdminAttendanceRosterRowDTO[] = faculty.map((f) => {
    const record = byFaculty.get(f.id);
    return {
      facultyId: f.id,
      facultyName: f.name,
      facultyImageUrl: f.profileImageUrl,
      isCC: f.isCC,
      record: record ? toDTO(record) : null,
    };
  });

  return { date: date.toISOString(), officeStartTime, rows };
}
