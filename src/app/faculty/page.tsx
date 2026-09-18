import { redirect } from "next/navigation";

/**
 * The faculty portal's landing route.
 *
 * The dashboard itself lives at `/faculty/dashboard` rather than here so that
 * every sidebar destination is a distinct path: `PortalSidebar` marks a link
 * active when the pathname starts with its href, so a nav entry pointing at
 * the bare `/faculty` prefix would light up on every faculty page at once.
 */
export default function FacultyIndex() {
  redirect("/faculty/dashboard");
}
