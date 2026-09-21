type DatedSubmission = {
  submittedAt: Date;
  dueAt: Date | null;
};

type AttendanceMark = {
  status: string;
};

export function calculateStudentPerformance({
  submissions,
  ratings,
  attendance,
}: {
  submissions: DatedSubmission[];
  ratings: Array<number | null>;
  attendance: AttendanceMark[];
}) {
  const dueSubmissions = submissions.filter((item) => item.dueAt !== null);
  const onTimeCount = dueSubmissions.filter(
    (item) => item.submittedAt.getTime() <= item.dueAt!.getTime(),
  ).length;
  const validRatings = ratings.filter((rating): rating is number => rating !== null);
  const presentCount = attendance.filter((mark) => mark.status === "PRESENT").length;
  const absentCount = attendance.filter((mark) => mark.status === "ABSENT").length;
  const attendanceTotal = presentCount + absentCount;

  return {
    onTimeDelivery: {
      count: onTimeCount,
      total: dueSubmissions.length,
      percentage: dueSubmissions.length ? (onTimeCount / dueSubmissions.length) * 100 : null,
    },
    feedback: {
      count: validRatings.length,
      average: validRatings.length
        ? validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length
        : null,
    },
    attendance: {
      present: presentCount,
      absent: absentCount,
      total: attendanceTotal,
      percentage: attendanceTotal ? (presentCount / attendanceTotal) * 100 : null,
    },
  };
}
