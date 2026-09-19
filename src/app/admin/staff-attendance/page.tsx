import { Clock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/Avatar";
import { Table, THead, Th, TBody, Tr, Td } from "@/components/Table";
import { AttendanceDateFilter } from "@/components/admin/AttendanceDateFilter";
import { StaffAttendanceSettingsControl } from "@/components/admin/StaffAttendanceSettingsControl";
import { getAdminAttendanceRoster } from "@/lib/staff-attendance";
import { formatClock } from "@/lib/staff-attendance-types";

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const late = roster.rows.filter((r) => r.record?.isLate).length;
  const notCheckedIn = roster.rows.length - checkedIn;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff Attendance"
        description={`${checkedIn} checked in · ${late} late · ${notCheckedIn} not checked in yet, for ${new Date(roster.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}${isToday ? " (today)" : ""}.`}
        actions={
          <div className="flex items-center gap-2">
            <AttendanceDateFilter value={dateValue} />
            <StaffAttendanceSettingsControl officeStartTime={roster.officeStartTime} />
          </div>
        }
      />

      {roster.rows.length === 0 ? (
        <EmptyState icon={Clock} title="No faculty yet" description="Add faculty accounts to start tracking office attendance." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <Table>
            <THead>
              <Th>Faculty</Th>
              <Th>Check-in</Th>
              <Th>Check-out</Th>
              <Th>Status</Th>
            </THead>
            <TBody>
              {roster.rows.map((row) => {
                const record = row.record;
                const status = !record?.checkInAt
                  ? { label: isToday ? "Not checked in yet" : "Absent", tone: "bg-zinc-100 text-zinc-500" }
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
                    <Td>{formatClock(record?.checkInAt ?? null)}</Td>
                    <Td>{formatClock(record?.checkOutAt ?? null)}</Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium ${status.tone}`}>
                        {record?.isLate && <AlertTriangle size={11} />}
                        {status.label}
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
