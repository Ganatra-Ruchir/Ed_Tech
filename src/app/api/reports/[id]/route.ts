import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, canAccessStudent } from "@/lib/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let allowed = false;
  if (report.studentId) allowed = await canAccessStudent(session, report.studentId);
  else if (report.batchId) {
    if (session.role !== "FACULTY" && session.role !== "ADMIN") {
      allowed = false;
    } else {
      allowed = await canAccessBatch(session, report.batchId);
    }
  }
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ report: { id: report.id, url: report.pdfPath, generatedAt: report.generatedAt } });
}
