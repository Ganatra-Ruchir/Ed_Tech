import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessBatch } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { LinkButton } from "@/components/Button";
import { CalendarCheck } from "lucide-react";
import { RosterManager } from "./RosterManager";

export default async function FacultyBatchRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;

  const batch = await prisma.batch.findUnique({ where: { id } });
  if (!batch) notFound();

  const allowed = await canAccessBatch(session!, id);
  if (!allowed) notFound();

  const memberships = await prisma.userBatch.findMany({
    where: { batchId: id, user: { role: "STUDENT" } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title={batch.name}
        description={`${batch.department} · Semester ${batch.semester}`}
        actions={<LinkButton href={`/faculty/attendance?batchId=${id}`} size="sm"><CalendarCheck size={14} /> Take attendance</LinkButton>}
      />
      <RosterManager
        batchId={id}
        students={memberships.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }))}
      />
    </div>
  );
}
