import { PageSkeleton } from "@/components/PageSkeleton";

// Shown instantly on navigation inside this portal while the next page's data
// loads, so clicks get immediate feedback instead of a frozen screen.
export default function Loading() {
  return <PageSkeleton />;
}
