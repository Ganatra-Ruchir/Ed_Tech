import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { userBatchIds } from "@/lib/permissions";

/**
 * Omnisearch for the student portal's top-bar search box: matches across the
 * student's own submissions, tests assigned to their batches, and
 * announcements in those batches. SQLite's `contains` is case-sensitive, so
 * matching is done in JS against a small, already-scoped candidate set
 * rather than relying on the database to do case-insensitive filtering.
 */
export async function GET(request: Request) {
  const guard = await requireRole("STUDENT");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const batchIds = await userBatchIds(session.sub);

  const [submissions, tests, announcements] = await Promise.all([
    prisma.submission.findMany({
      where: { studentId: session.sub },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.test.findMany({
      where: { publishedAt: { not: null }, batchId: { in: batchIds } },
      select: { id: true, title: true, dueAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.announcement.findMany({
      where: { batchId: { in: batchIds } },
      select: { id: true, title: true, body: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const results = [
    ...submissions
      .filter((s) => s.title.toLowerCase().includes(q))
      .map((s) => ({
        kind: "submission" as const,
        id: s.id,
        title: s.title,
        meta: s.status.replaceAll("_", " "),
        href: `/student/submissions/${s.id}`,
      })),
    ...tests
      .filter((t) => t.title.toLowerCase().includes(q))
      .map((t) => ({
        kind: "test" as const,
        id: t.id,
        title: t.title,
        meta: t.dueAt ? `Due ${new Date(t.dueAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}` : "No due date",
        href: `/student/tests/${t.id}`,
      })),
    ...announcements
      .filter((a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q))
      .map((a) => ({
        kind: "announcement" as const,
        id: a.id,
        title: a.title,
        meta: "Class Stream",
        href: `/student/stream`,
      })),
  ].slice(0, 8);

  return NextResponse.json({ results });
}
