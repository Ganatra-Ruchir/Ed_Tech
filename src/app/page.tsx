import { redirect } from "next/navigation";
import { getSession, roleHome } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();
  redirect(session ? roleHome(session.role) : "/login");
}
