import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { LeaveRequestDTO, LeaveStatus } from "@/lib/leave-requests";
import { FacultyLeaveRequests } from "./FacultyLeaveRequests";

export default async function FacultyLeavePage() {
  const session = await getSession();
  if (!session || session.role !== "FACULTY") redirect("/login");

  const [requests, handoverFaculty] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { facultyId: session.sub },
      include: { faculty: { select: { name: true, email: true } }, reviewer: { select: { name: true } }, handoverFaculty: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "FACULTY", id: { not: session.sub } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const initialRequests: LeaveRequestDTO[] = requests.map((request) => ({
    id: request.id,
    facultyId: request.facultyId,
    facultyName: request.faculty.name,
    facultyEmail: request.faculty.email,
    startDate: request.startDate,
    endDate: request.endDate,
    reason: request.reason,
    status: request.status as LeaveStatus,
    adminNote: request.adminNote,
    handoverFacultyId: request.handoverFacultyId,
    handoverFacultyName: request.handoverFaculty?.name ?? null,
    handoverNotes: request.handoverNotes,
    reviewerName: request.reviewer?.name ?? null,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
  }));

  return <FacultyLeaveRequests initialRequests={initialRequests} facultyOptions={handoverFaculty} />;
}
