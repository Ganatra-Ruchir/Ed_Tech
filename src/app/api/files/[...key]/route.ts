import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readLocalFile } from "@/lib/storage";
import { contentTypeFor } from "@/lib/uploads";
import { canAccessSubmission, canAccessStudent, canAccessBatch } from "@/lib/permissions";

// Force a download for anything that isn't a safe inline type. Serving an
// uploaded HTML/SVG file inline same-origin would let it run scripts in the
// viewer's authenticated session, so only raster images and PDFs are shown
// inline. image/svg+xml is EXCLUDED even though it starts with "image/" --
// an SVG can carry a <script> tag and Content-Disposition: inline would
// execute it same-origin with the viewer's session cookie.
const INLINE_SAFE_EXACT = new Set(["application/pdf"]);
function inlineSafe(contentType: string): boolean {
  if (contentType === "image/svg+xml") return false;
  return contentType.startsWith("image/") || INLINE_SAFE_EXACT.has(contentType);
}
function dispositionFor(contentType: string, filename: string): string {
  const mode = inlineSafe(contentType) ? "inline" : "attachment";
  return `${mode}; filename="${filename.replace(/"/g, "")}"`;
}
// Belt-and-braces: even for the types we do serve inline, tell the browser
// not to sniff the body into a different, more dangerous content type.
const NOSNIFF = { "X-Content-Type-Options": "nosniff" } as const;

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
    if (file) {
      const allowed = await canAccessSubmission(session, file.submission);
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const buffer = await readLocalFile(key);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          ...NOSNIFF,
          "Content-Type": file.fileType,
          "Content-Disposition": dispositionFor(file.fileType, file.fileName),
        },
      });
    }
    // Profile avatars also live under uploads/. They are viewable by any
    // authenticated user (avatars render across the app). Matched by the
    // existing profileImageUrl column so this compiles without the new client.
    const avatarUser = await prisma.user.findFirst({ where: { profileImageUrl: url }, select: { id: true } });
    if (avatarUser) {
      const buffer = await readLocalFile(key);
      const fileName = key.split("/").at(-1) ?? "avatar";
      const contentType = contentTypeFor(fileName);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          ...NOSNIFF,
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="avatar"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (key.startsWith("reports/")) {
    const report = await prisma.report.findFirst({ where: { pdfPath: url } });
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

    const buffer = await readLocalFile(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...NOSNIFF,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="report.pdf"`,
      },
    });
  }

  if (key.startsWith("assignments/")) {
    const file = await prisma.assignment.findFirst({
      where: { attachmentUrl: url },
    });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const allowed = await canAccessBatch(session, file.batchId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const buffer = await readLocalFile(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...NOSNIFF,
        "Content-Type": file.attachmentType ?? "application/pdf",
        "Content-Disposition": dispositionFor(file.attachmentType ?? "application/pdf", file.attachmentName ?? "assignment.pdf"),
      },
    });
  }

  if (key.startsWith("announcements/")) {
    const file = await prisma.announcement.findFirst({
      where: { OR: [{ attachmentUrl: url }, { bannerUrl: url }] },
    });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!(await canAccessBatch(session, file.batchId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const isBanner = file.bannerUrl === url;
    const fileName = key.split("/").at(-1) ?? (isBanner ? "announcement-banner" : "announcement-file");
    const contentType = isBanner ? contentTypeFor(fileName) : (file.attachmentType ?? "application/pdf");
    const buffer = await readLocalFile(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...NOSNIFF,
        "Content-Type": contentType,
        "Content-Disposition": dispositionFor(contentType, isBanner ? "announcement-banner" : (file.attachmentName ?? "announcement.pdf")),
        ...(isBanner ? { "Cache-Control": "private, max-age=300" } : {}),
      },
    });
  }

  if (key.startsWith("materials/")) {
    const material = await prisma.learningMaterial.findFirst({ where: { fileUrl: url } });
    if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!(await canAccessBatch(session, material.batchId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const buffer = await readLocalFile(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...NOSNIFF,
        "Content-Type": material.fileType,
        "Content-Disposition": dispositionFor(material.fileType, material.fileName),
      },
    });
  }

  if (key.startsWith("messages/")) {
    const file = await prisma.messageAttachment.findFirst({ where: { fileUrl: url }, include: { message: { include: { conversation: { include: { members: true } } } } } });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!file.message.conversation.members.some((member) => member.userId === session.sub)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const buffer = await readLocalFile(key);
    return new NextResponse(new Uint8Array(buffer), { headers: { ...NOSNIFF, "Content-Type": file.fileType, "Content-Disposition": dispositionFor(file.fileType, file.fileName) } });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
