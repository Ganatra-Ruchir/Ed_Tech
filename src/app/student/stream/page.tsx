import { getSession } from "@/lib/auth";
import { listAnnouncements } from "@/lib/announcements";
import { PageHeader } from "@/components/PageHeader";
import { AnnouncementFeed } from "@/components/announcements/AnnouncementFeed";
import { Megaphone } from "lucide-react";

export default async function StudentStreamPage() {
  const session = await getSession();
  // recordSeen=true: loading the stream marks these announcements as seen for
  // this student, which is what powers the faculty "seen" counts.
  const announcements = await listAnnouncements(session!, true);

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader icon={Megaphone} title="Messages & Announcements" description="Stay updated with important information from your faculty and institution." />
      <AnnouncementFeed announcements={announcements} canSeeInsights={false} />
    </div>
  );
}
