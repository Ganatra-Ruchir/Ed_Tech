export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export type LeaveRequestDTO = {
  id: string;
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  adminNote: string | null;
  handoverFacultyId: string | null;
  handoverFacultyName: string | null;
  handoverNotes: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export function leaveDayCount(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}
