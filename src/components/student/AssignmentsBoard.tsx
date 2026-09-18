import Link from "next/link";
import { ClipboardList, FileText } from "lucide-react";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/Button";

export type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  batchName: string;
  attachmentUrl: string | null;
  submitted: boolean;
};

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "No due date";
}

export function AssignmentsBoard({ assignments }: { assignments: AssignmentRow[] }) {
  if (assignments.length === 0) {
    return <Card><EmptyState icon={ClipboardList} title="No assignments yet" description="Your faculty will publish tasks for your batch here." /></Card>;
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => (
        <Card key={assignment.id} className="flex flex-wrap items-start gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#6b1029]/[0.08] text-[#6b1029]"><ClipboardList size={17} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-zinc-900">{assignment.title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{assignment.batchName} · Due {formatDate(assignment.dueAt)}</p>
            {assignment.description && <p className="mt-2 text-sm text-zinc-600">{assignment.description}</p>}
            {assignment.attachmentUrl && <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#6b1029] hover:underline"><FileText size={13} /> View instructions PDF</a>}
          </div>
          {assignment.submitted ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Submitted</span> : <LinkButton href={`/student/submissions/new?assignmentId=${assignment.id}`} size="sm" className="!bg-[#6b1029] hover:!bg-[#7c1638]">Submit work</LinkButton>}
        </Card>
      ))}
    </div>
  );
}