import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { userBatchIds } from "@/lib/permissions";

/**
 * Omnisearch for the faculty portal's top-bar search box: matches across the
 * students, submissions and tests of the batches this faculty member can see
 * (all batches for a Course Coordinator). SQLite's `contains` is
 * case-sensitive, so matching is done in JS over a small, already-scoped
 * candidate set rather than in the database.
 */
export async function GET(request: Request) {
  const guard = await requireRole("FACULTY");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const batchIds = session.isCC
    ? (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id)
    : await userBatchIds(session.sub);

  const [students, submissions, tests] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT", batchMemberships: { some: { batchId: { in: batchIds } } } },
      select: {
        id: true,
        name: true,
        email: true,
        batchMemberships: {
          where: { batchId: { in: batchIds } },
          select: { batch: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.submission.findMany({
      where: { batchId: { in: batchIds } },
      select: {
        id: true,
        title: true,
        status: true,
        student: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.test.findMany({
      where: { batchId: { in: batchIds } },
      select: {
        id: true,
        title: true,
        publishedAt: true,
        batch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
  ]);

  const results = [
    ...students
      .filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
      .map((s) => ({
        kind: "student" as const,
        id: s.id,
        title: s.name,
        meta: s.batchMemberships[0]?.batch.name ?? s.email,
        href: `/faculty/students/${s.id}`,
      })),
    ...submissions
      .filter((s) => s.title.toLowerCase().includes(q) || s.student.name.toLowerCase().includes(q))
      .map((s) => ({
        kind: "submission" as const,
        id: s.id,
        title: s.title,
        meta: `${s.student.name} · ${s.status.replaceAll("_", " ")}`,
        href: `/faculty/submissions/${s.id}`,
      })),
    ...tests
      .filter((t) => t.title.toLowerCase().includes(q))
      .map((t) => ({
        kind: "test" as const,
        id: t.id,
        title: t.title,
        meta: `${t.batch.name} · ${t.publishedAt ? "Published" : "Draft"}`,
        href: `/faculty/tests/${t.id}`,
      })),
  ].slice(0, 8);

  return NextResponse.json({ results });
}
