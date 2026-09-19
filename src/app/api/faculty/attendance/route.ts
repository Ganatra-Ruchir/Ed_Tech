import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api-guard";
import { checkIn, checkOut, getFacultyAttendanceStatus } from "@/lib/staff-attendance";

const bodySchema = z.object({ action: z.enum(["check_in", "check_out"]) });

/** Own office check-in/check-out status + recent history for the calling
 * faculty member. */
export async function GET() {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;
  const status = await getFacultyAttendanceStatus(guard.session.sub);
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid attendance action." }, { status: 400 });
  }

  const result =
    parsed.data.action === "check_in"
      ? await checkIn(guard.session.sub)
      : await checkOut(guard.session.sub);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ record: result.record });
}
