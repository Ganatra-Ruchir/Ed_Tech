import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { LectureAttendance } from "./LectureAttendance";

export default async function FacultyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string }>;
}) {
  const session = await getSession();
  const { batchId: requestedBatchId } = await searchParams;
  const batchIds = session!.isCC
    ? (await prisma.batch.findMany({ select: { id: true } })).map((batch) => batch.id)
    : await userBatchIds(session!.sub);
  const batches = await prisma.batch.findMany({
    where: { id: { in: batchIds } },
    include: {
      members: {
        where: { user: { role: "STUDENT" } },
        include: { user: { select: { id: true, name: true, email: true, studentNumber: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
    orderBy: [{ semester: "asc" }, { name: "asc" }],
  });
  const initialBatchId = requestedBatchId && batchIds.includes(requestedBatchId)
    ? requestedBatchId
    : batches[0]?.id ?? "";

  return (
    <LectureAttendance
      initialBatchId={initialBatchId}
      batches={batches.map((batch) => ({
        id: batch.id,
        name: batch.name,
        department: batch.department,
        semester: batch.semester,
        students: batch.members.map((member) => member.user),
      }))}
    />
  );
}
