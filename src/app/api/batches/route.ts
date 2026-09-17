import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { userBatchIds } from "@/lib/permissions";

export async function GET() {
  const guard = await requireRole("FACULTY", "ADMIN");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const where =
    session.role === "ADMIN" || session.isCC
      ? {}
      : { id: { in: await userBatchIds(session.sub) } };

  const batches = await prisma.batch.findMany({
    where,
    include: { _count: { select: { members: true, submissions: true, tests: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ batches });
}
