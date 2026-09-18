import { getSession } from "@/lib/auth";
import { ProfilePanel } from "@/components/ProfilePanel";

export default async function StudentProfilePage() {
  const session = await getSession();
  return <ProfilePanel session={session!} />;
}
