import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { loadAccessibleClass } from "@/lib/live/classes";
import { liveAttendanceRows } from "@/lib/live/attendance";

/** Attendance report for a class. `?format=csv` downloads it. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { liveClass, isHost } = await loadAccessibleClass(guard.session, id);
  if (!liveClass || !isHost) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await liveAttendanceRows(liveClass);

  if (new URL(request.url).searchParams.get("format") === "csv") {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      ["Student", "Email", "Status", "Minutes attended", "Attendance %", "First joined", "Last left", "Times joined"].map(esc).join(","),
      ...rows.map((r) =>
        [r.name, r.email, r.status, r.minutes, r.percent, r.firstJoinedAt ?? "", r.lastLeftAt ?? "", r.joinCount].map(esc).join(","),
      ),
    ].join("\n");
    const filename = `${liveClass.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-attendance.csv`;
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` },
    });
  }
  return NextResponse.json({ rows });
}

/**
 * Copies live-class attendance into the batch's daily attendance register:
 * students who attended at least `minPercent` of the class are marked present,
 * everyone else absent.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { liveClass, isHost } = await loadAccessibleClass(guard.session, id);
  if (!liveClass || !isHost) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (liveClass.status !== "ENDED") return NextResponse.json({ error: "End the class first." }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { minPercent?: number };
  const minPercent = Math.min(100, Math.max(0, body.minPercent ?? 50));
  const rows = await liveAttendanceRows(liveClass);
  const date = new Date(Date.UTC(liveClass.scheduledAt.getUTCFullYear(), liveClass.scheduledAt.getUTCMonth(), liveClass.scheduledAt.getUTCDate()));
  await prisma.$transaction(
    rows.map((r) =>
      prisma.attendance.upsert({
        where: { batchId_studentId_date: { batchId: liveClass.batchId, studentId: r.userId, date } },
        create: { batchId: liveClass.batchId, studentId: r.userId, date, status: r.percent >= minPercent ? "PRESENT" : "ABSENT" },
        update: { status: r.percent >= minPercent ? "PRESENT" : "ABSENT" },
      }),
    ),
  );
  await logAudit({ actorId: guard.session.sub, action: "LIVE_CLASS_ATTENDANCE_SYNCED", entityType: "LiveClass", entityId: id, metadata: { minPercent } });
  return NextResponse.json({ ok: true, present: rows.filter((r) => r.percent >= minPercent).length, total: rows.length });
}
