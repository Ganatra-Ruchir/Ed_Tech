import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { AvatarUploader } from "@/components/AvatarUploader";
import { UserCircle } from "lucide-react";

/** Shared profile page body for every role. Reads the signed-in user's live
 * record so the avatar reflects the latest upload. */
export async function ProfilePanel({ session }: { session: SessionPayload }) {
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      name: true, email: true, role: true, isCC: true,
      profileImageUrl: true, enrollmentNumber: true, branch: true, college: true,
    },
  });
  if (!user) return null;

  const roleLabel = user.role === "FACULTY" ? (user.isCC ? "Faculty · Course Coordinator" : "Faculty") : user.role.charAt(0) + user.role.slice(1).toLowerCase();

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader icon={UserCircle} title="My Profile" description="Manage your personal information and academic details." />
      <Card className="p-5">
        <h2 className="mb-4 text-[13px] font-semibold text-zinc-900">Profile picture</h2>
        <AvatarUploader name={user.name} imageUrl={user.profileImageUrl} />
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 text-[13px] font-semibold text-zinc-900">Account details</h2>
        <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
          <Field label="Name" value={user.name} />
          <Field label="Email" value={user.email} />
          <Field label="Role" value={roleLabel} />
          {user.enrollmentNumber && <Field label="Enrollment number" value={user.enrollmentNumber} />}
          {user.branch && <Field label="Branch" value={user.branch} />}
          {user.college && <Field label="College" value={user.college} />}
        </dl>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-zinc-800">{value}</dd>
    </div>
  );
}
