import { Megaphone } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { StreamFeed, type StreamPost } from "@/components/student/StreamFeed";

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/** "2 days ago" style label. Computed on the server (this page is already
 * fully dynamic — it reads the session cookie) so the client never has to
 * derive "now" and risk a hydration mismatch. */
function relativeTime(d: Date, now: number): string {
  const seconds = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export default async function StudentStreamPage() {
  const session = await getSession();
  const batchIds = await userBatchIds(session!.sub);

  const announcements = await prisma.announcement.findMany({
    where: { batchId: { in: batchIds } },
    include: { faculty: { select: { name: true } }, batch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const posts: StreamPost[] = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    facultyName: a.faculty.name,
    batchName: a.batch.name,
    postedOn: fmtDateTime(a.createdAt),
    relative: relativeTime(a.createdAt, now),
    attachmentUrl: a.attachmentUrl,
    attachmentName: a.attachmentName,
  }));

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Class Stream"
        description="Announcements and updates from your faculty."
        eyebrow={`${announcements.length} ${announcements.length === 1 ? "post" : "posts"}`}
        actions={
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6b1029]/[0.08] text-[#6b1029]">
            <Megaphone size={17} />
          </span>
        }
      />
      <StreamFeed posts={posts} />
    </div>
  );
}
