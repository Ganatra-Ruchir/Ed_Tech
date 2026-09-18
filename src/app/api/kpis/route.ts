import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { KPIScope } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, canAccessStudent, userBatchIds } from "@/lib/permissions";
import { getLatestKpis } from "@/lib/kpi";

export async function GET(request: Request) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const scopeParam = searchParams.get("scope") ?? "COHORT";
  const scope: KPIScope =
    scopeParam === "STUDENT" || scopeParam === "BATCH" ? scopeParam : "COHORT";
  const batchId = searchParams.get("batchId") ?? undefined;
  const studentId = searchParams.get("studentId") ?? undefined;
  const mode = searchParams.get("mode") === "history" ? "history" : "latest";

  if (scope === "COHORT" && session.role === "FACULTY" && !session.isCC) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (batchId) {
    const allowed = await canAccessBatch(session, batchId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (studentId) {
    const allowed = await canAccessStudent(session, studentId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: Prisma.KPIWhereInput = { scope };
  if (batchId) where.batchId = batchId;
  if (studentId) where.studentId = studentId;

  // A regular (non-CC) faculty must never see platform-wide rows. When no
  // explicit batch/student filter is given for STUDENT or BATCH scope, restrict
  // to their own batches. (CC faculty and admins are intentionally unrestricted.)
  if ((scope === "BATCH" || scope === "STUDENT") && !batchId && !studentId && session.role === "FACULTY" && !session.isCC) {
    where.batchId = { in: await userBatchIds(session.sub) };
  }

  if (mode === "history") {
    const kpis = await prisma.kPI.findMany({ where, orderBy: { computedAt: "asc" } });
    return NextResponse.json({ kpis });
  }

  const kpis = await getLatestKpis(where);
  return NextResponse.json({ kpis });
}
