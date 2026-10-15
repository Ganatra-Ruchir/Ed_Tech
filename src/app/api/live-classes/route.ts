import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { toLiveClassDTO } from "@/lib/live/classes";

const include = {
  batch: { select: { name: true } },
  host: { select: { name: true } },
  _count: { select: { recordings: true, participants: true } },
} as const;

/** Classes visible to the caller: their batches (students/faculty) or all (admin, CC). */
export async function GET() {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const seesAll = session.role === "ADMIN" || (session.role === "FACULTY" && session.isCC);
  const classes = await prisma.liveClass.findMany({
    where: seesAll ? {} : { batch: { members: { some: { userId: session.sub } } } },
    include,
    orderBy: { scheduledAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ classes: classes.map(toLiveClassDTO) });
}

const createSchema = z.object({
  batchId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  scheduledAt: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(10).max(600).default(60),
  waitingRoom: z.boolean().default(false),
  muteOnEntry: z.boolean().default(true),
  allowStudentScreenShare: z.boolean().default(false),
  autoRecord: z.boolean().default(false),
});

export async function POST(request: Request) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the class details and try again." }, { status: 400 });
  const data = parsed.data;
  if (!(await canAccessBatch(session, data.batchId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const liveClass = await prisma.liveClass.create({
    data: {
      ...data,
      description: data.description || null,
      scheduledAt: new Date(data.scheduledAt),
      hostId: session.sub,
      roomName: `lc_${randomBytes(9).toString("base64url")}`,
    },
    include,
  });
  await logAudit({ actorId: session.sub, action: "LIVE_CLASS_SCHEDULED", entityType: "LiveClass", entityId: liveClass.id });
  return NextResponse.json({ liveClass: toLiveClassDTO(liveClass) }, { status: 201 });
}
