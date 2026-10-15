/**
 * Instant placeholder shown by the portal `loading.tsx` files while a page's
 * server data loads. Static markup only — no client JS.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <div className="animate-skeleton-pulse h-7 w-56 rounded-md bg-[#e6e2dd]" />
        <div className="animate-skeleton-pulse h-4 w-80 max-w-full rounded-md bg-[#ece9e5]" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="animate-skeleton-pulse h-28 rounded-md border border-[#ebe5e1] bg-white" />
        ))}
      </div>
      <div className="animate-skeleton-pulse h-72 rounded-md border border-[#ebe5e1] bg-white" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
