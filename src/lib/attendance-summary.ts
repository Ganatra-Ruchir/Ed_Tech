export type AttendanceSummaryRecord = {
  studentId: string;
  status: string;
  date: Date | string;
};

export function calculateAttendanceSummary(records: AttendanceSummaryRecord[]) {
  const byStudent = new Map<string, { present: number; absent: number }>();
  const byDate = new Map<string, { date: string; present: number; absent: number }>();

  for (const record of records) {
    if (record.status !== "PRESENT" && record.status !== "ABSENT") continue;
    const date = new Date(record.date).toISOString();
    const student = byStudent.get(record.studentId) ?? { present: 0, absent: 0 };
    const day = byDate.get(date) ?? { date, present: 0, absent: 0 };
    if (record.status === "PRESENT") {
      student.present += 1;
      day.present += 1;
    } else {
      student.absent += 1;
      day.absent += 1;
    }
    byStudent.set(record.studentId, student);
    byDate.set(date, day);
  }

  const studentStats = Object.fromEntries(
    [...byStudent.entries()].map(([studentId, counts]) => {
      const total = counts.present + counts.absent;
      return [studentId, { ...counts, total, percentage: total === 0 ? 0 : Math.round((counts.present / total) * 1000) / 10 }];
    }),
  );
  const history = [...byDate.values()]
    .map((day) => {
      const total = day.present + day.absent;
      return { ...day, total, percentage: total === 0 ? 0 : Math.round((day.present / total) * 1000) / 10 };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return { studentStats, history };
}
