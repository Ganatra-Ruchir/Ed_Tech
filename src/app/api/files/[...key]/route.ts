import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readLocalFile } from "@/lib/storage";
import { canAccessSubmission, canAccessStudent, canAccessBatch } from "@/lib/permissions";

// Only used in local-disk fallback mode (no BLOB_READ_WRITE_TOKEN). Vercel
// Blob URLs are served directly and bypass this route entirely.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { key: keyParts } = await params;
  const key = keyParts.join("/");
  const url = `/api/files/${key}`;

  if (key.startsWith("uploads/")) {
    const file = await prisma.submissionFile.findFirst({
      where: { fileUrl: url },
      include: { submission: true },
    });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const allowed = await canAccessSubmission(session, file.submission);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const buffer = await readLocalFile(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.fileType,
        "Content-Disposition": `inline; filename="${file.fileName}"`,
      },
    });
  }

  if (key.startsWith("reports/")) {
    const report = await prisma.report.findFirst({ where: { pdfPath: url } });
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let allowed = false;
    if (report.studentId) allowed = await canAccessStudent(session, report.studentId);
    else if (report.batchId) allowed = await canAccessBatch(session, report.batchId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const buffer = await readLocalFile(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="report.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
