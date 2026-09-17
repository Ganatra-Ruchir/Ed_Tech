import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch } from "@/lib/permissions";

export async function GET(request: Request) {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  let batchId: string | null = null;
  if (entityType === "Submission") {
    const submission = await prisma.submission.findUnique({ where: { id: entityId } });
    batchId = submission?.batchId ?? null;
  } else if (entityType === "TestResponse") {
    const response = await prisma.testResponse.findUnique({
      where: { id: entityId },
      include: { test: true },
    });
    batchId = response?.test.batchId ?? null;
  } else if (entityType === "Test") {
    const test = await prisma.test.findUnique({ where: { id: entityId } });
    batchId = test?.batchId ?? null;
  }

  if (!batchId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = await canAccessBatch(session, batchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const logs = await prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ logs });
}
