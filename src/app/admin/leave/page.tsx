import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { LeaveRequestDTO, LeaveStatus } from "@/lib/leave-requests";
import { AdminLeaveRequests } from "./AdminLeaveRequests";

export default async function AdminLeavePage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const requests = await prisma.leaveRequest.findMany({
    include: { faculty: { select: { name: true, email: true } }, reviewer: { select: { name: true } }, handoverFaculty: { select: { name: true } } },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
  });
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

  return <AdminLeaveRequests initialRequests={initialRequests} />;
}
