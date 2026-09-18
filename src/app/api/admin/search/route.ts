import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";

/**
 * Omnisearch for the admin portal's top-bar search box: matches across
 * students, faculty and batches. SQLite's `contains` is case-sensitive, so
 * matching is done in JS against a bounded candidate set rather than relying
 * on the database to filter case-insensitively.
 *
 * `kind` is constrained to the union the shared PortalTopbar knows how to
 * render an icon for, so people (students and faculty alike) are returned as
 * `student` and the role is carried in `meta`.
 */
export async function GET(request: Request) {
  const guard = await requireRole("ADMIN");
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const [students, faculty, batches] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        batchMemberships: { select: { batch: { select: { name: true } } } },
      },
      orderBy: { name: "asc" },
      take: 300,
    }),
    prisma.user.findMany({
      where: { role: "FACULTY" },
      select: { id: true, name: true, email: true, isCC: true },
      orderBy: { name: "asc" },
      take: 300,
    }),
    prisma.batch.findMany({
      select: { id: true, name: true, department: true, semester: true },
      orderBy: { name: "asc" },
      take: 300,
    }),
  ]);

  const matches = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(q));

  const results = [
    ...students
      .filter((s) => matches(s.name, s.email))
      .map((s) => ({
        kind: "student" as const,
        id: s.id,
        title: s.name,
        meta: s.batchMemberships.length
          ? `Student · ${s.batchMemberships.map((m) => m.batch.name).join(", ")}`
          : "Student · no batch",
        href: `/admin/students/${s.id}`,
      })),
    ...faculty
      .filter((f) => matches(f.name, f.email))
      .map((f) => ({
        kind: "student" as const,
        id: f.id,
        title: f.name,
        meta: `${f.isCC ? "Course coordinator" : "Faculty"} · ${f.email}`,
        href: "/admin/faculty",
      })),
    ...batches
      .filter((b) => matches(b.name, b.department, b.semester))
      .map((b) => ({
        kind: "batch" as const,
        id: b.id,
        title: b.name,
        meta: `${b.department} · Semester ${b.semester}`,
        href: `/admin/batches/${b.id}`,
      })),
  ].slice(0, 8);

  return NextResponse.json({ results });
}
