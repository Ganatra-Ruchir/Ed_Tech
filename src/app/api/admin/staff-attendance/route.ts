import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { getAdminAttendanceRoster, setOfficeStartTime } from "@/lib/staff-attendance";

const settingsSchema = z.object({ officeStartTime: z.string().min(1).max(5) });

/** Admin roster view: every faculty member's check-in/check-out record for a
 * given date (defaults to today) plus the configured office start time. */
export async function GET(request: Request) {
  const guard = await requireRole("ADMIN");
  if (!guard.ok) return guard.response;
  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  const roster = await getAdminAttendanceRoster(date);
  return NextResponse.json(roster);
}

/** Update the office start time used to flag late check-ins. */
export async function PATCH(request: Request) {
  const guard = await requireRole("ADMIN");
  if (!guard.ok) return guard.response;

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid office start time." }, { status: 400 });
  }

  const result = await setOfficeStartTime(parsed.data.officeStartTime);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAudit({
    actorId: guard.session.sub,
    action: "UPDATE_OFFICE_START_TIME",
    entityType: "AttendanceSettings",
    entityId: "singleton",
    metadata: { officeStartTime: result.officeStartTime },
  });

  return NextResponse.json({ officeStartTime: result.officeStartTime });
}
