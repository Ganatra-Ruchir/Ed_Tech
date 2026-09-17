import { NextResponse } from "next/server";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canAccessBatch, canAccessStudent } from "@/lib/permissions";
import { storeFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { getStudentReportData, getBatchReportData } from "@/lib/pdf/data";
import { StudentReportDocument } from "@/lib/pdf/StudentReportDocument";
import { BatchReportDocument } from "@/lib/pdf/BatchReportDocument";

const bodySchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("student"), studentId: z.string().min(1) }),
  z.object({ scope: z.literal("batch"), batchId: z.string().min(1) }),
]);

export async function POST(request: Request) {
  const guard = await requireRole();
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (parsed.data.scope === "student") {
    const { studentId } = parsed.data;
    const allowed = await canAccessStudent(session, studentId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const data = await getStudentReportData(studentId);
    const buffer = await renderToBuffer(<StudentReportDocument data={data} />);
    const stored = await storeFile({
      buffer,
      filename: `student-report-${studentId}.pdf`,
      contentType: "application/pdf",
      folder: "reports",
    });

    const report = await prisma.report.create({
      data: { scope: "STUDENT", studentId, pdfPath: stored.url },
    });

    await logAudit({
      actorId: session.sub,
      action: "report.generate.student",
      entityType: "Report",
      entityId: report.id,
      metadata: { studentId },
    });

    return NextResponse.json({ report: { id: report.id, url: stored.url } }, { status: 201 });
  }

  const { batchId } = parsed.data;
  const allowed = await canAccessBatch(session, batchId);
  if (!allowed || session.role === "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getBatchReportData(batchId);
  const buffer = await renderToBuffer(<BatchReportDocument data={data} />);
  const stored = await storeFile({
    buffer,
    filename: `batch-report-${batchId}.pdf`,
    contentType: "application/pdf",
    folder: "reports",
  });

  const report = await prisma.report.create({
    data: { scope: "BATCH", batchId, pdfPath: stored.url },
  });

  await logAudit({
    actorId: session.sub,
    action: "report.generate.batch",
    entityType: "Report",
    entityId: report.id,
    metadata: { batchId },
  });

  return NextResponse.json({ report: { id: report.id, url: stored.url } }, { status: 201 });
}
