import { Clock, AlertTriangle, CheckCircle2, LogOut, Timer, UserX } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/Avatar";
import { Table, THead, Th, TBody, Tr, Td } from "@/components/Table";
import { AttendanceDateFilter } from "@/components/admin/AttendanceDateFilter";
import { StaffAttendanceSettingsControl } from "@/components/admin/StaffAttendanceSettingsControl";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { getAdminAttendanceRoster } from "@/lib/staff-attendance";
import { formatClock } from "@/lib/staff-attendance-types";

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function workDuration(checkInAt: string | null, checkOutAt: string | null, isToday: boolean) {
  if (!checkInAt) return "—";
  if (!checkOutAt) return isToday ? "In office" : "No check-out";
  const totalMinutes = Math.max(0, Math.round((new Date(checkOutAt).getTime() - new Date(checkInAt).getTime()) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default async function AdminStaffAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const roster = await getAdminAttendanceRoster(date);
  const dateValue = toDateInputValue(roster.date);
  const isToday = dateValue === toDateInputValue(new Date().toISOString());

  const checkedIn = roster.rows.filter((r) => r.record?.checkInAt).length;
  const checkedOut = roster.rows.filter((r) => r.record?.checkOutAt).length;
  const late = roster.rows.filter((r) => r.record?.isLate).length;
  const absent = roster.rows.length - checkedIn;
  const onTime = checkedIn - late;
  const onTimePct = checkedIn ? Math.round((onTime / checkedIn) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff Attendance"
        icon={Clock}
        description={`Faculty presence and office timing for ${new Date(roster.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}${isToday ? " (today)" : ""}.`}
        actions={
          <div className="flex items-center gap-2">
            <AttendanceDateFilter value={dateValue} />
            <StaffAttendanceSettingsControl officeStartTime={roster.officeStartTime} />
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <AdminStatCard label="Present" value={String(checkedIn)} icon={CheckCircle2} tone="emerald" footnote={`Out of ${roster.rows.length} faculty`} />
        <AdminStatCard label="Absent" value={String(absent)} icon={UserX} tone="maroon" footnote={`Out of ${roster.rows.length} faculty`} />
        <AdminStatCard label="Checked out" value={String(checkedOut)} icon={LogOut} tone="sky" footnote="Left for the day" />
        <AdminStatCard label="Late arrivals" value={String(late)} icon={AlertTriangle} tone="amber" footnote={`After ${roster.officeStartTime}`} />
        <AdminStatCard label="On-time %" value={`${onTimePct}%`} icon={Clock} tone="violet" footnote={`${onTime} of ${checkedIn} on time`} />
      </section>

      {roster.rows.length === 0 ? (
        <EmptyState icon={Clock} title="No faculty yet" description="Add faculty accounts to start tracking office attendance." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <Table>
            <THead>
              <Th>Faculty</Th>
              <Th>Attendance</Th>
              <Th>Check-in</Th>
              <Th>Check-out</Th>
              <Th>Work time</Th>
              <Th>Punctuality</Th>
            </THead>
            <TBody>
              {roster.rows.map((row) => {
                const record = row.record;
                const punctuality = !record?.checkInAt
                  ? { label: "Not recorded", tone: "bg-zinc-100 text-zinc-500" }
                  : record.isLate
                    ? { label: "Late", tone: "bg-amber-50 text-amber-700" }
                    : { label: "On time", tone: "bg-emerald-50 text-emerald-700" };
                return (
                  <Tr key={row.facultyId}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.facultyName} size="sm" imageUrl={row.facultyImageUrl} />
                        <span className="font-medium text-zinc-800">
                          {row.facultyName}
                          {row.isCC && (
                            <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                              CC
                            </span>
                          )}
                        </span>
                      </div>
                    </Td>
                    <Td>{record?.checkInAt ? <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11.5px] font-semibold text-emerald-700"><CheckCircle2 size={12} /> Present</span> : <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1 text-[11.5px] font-semibold text-rose-700"><UserX size={12} /> Absent</span>}</Td>
                    <Td>{formatClock(record?.checkInAt ?? null)}</Td>
                    <Td>{record?.checkInAt && !record.checkOutAt && isToday ? <span className="text-xs font-medium text-sky-700">Still in office</span> : formatClock(record?.checkOutAt ?? null)}</Td>
                    <Td><span className="inline-flex items-center gap-1 text-xs text-zinc-600"><Timer size={12} /> {workDuration(record?.checkInAt ?? null, record?.checkOutAt ?? null, isToday)}</span></Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium ${punctuality.tone}`}>
                        {record?.isLate && <AlertTriangle size={11} />}
                        {punctuality.label}
                      </span>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
