import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, userBatchIds } from "@/lib/permissions";

export async function GET(request: Request) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");

  if (batchId) {
    const allowed = await canAccessBatch(session, batchId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Scope the default (no batchId) listing: a non-CC faculty only sees students
  // in their own batches, never the whole institution. CC faculty and admins
  // see all. Mirrors the fallback used in assignments/tests routes.
  const scopeFilter =
    batchId
      ? { batchId }
      : session.role === "FACULTY" && !session.isCC
        ? { batchId: { in: await userBatchIds(session.sub) } }
        : {};

  const memberships = await prisma.userBatch.findMany({
    where: {
      user: { role: "STUDENT" },
      ...scopeFilter,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      batch: { select: { id: true, name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const students = memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    batchId: m.batch.id,
    batchName: m.batch.name,
  }));

  return NextResponse.json({ students });
}
