export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6 px-4 py-8 sm:px-6 lg:px-8" role="status" aria-label="Loading page">
      <div className="animate-skeleton-pulse h-7 w-56 rounded-md bg-[#dfe3dc]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="animate-skeleton-pulse h-28 rounded-md bg-white" style={{ animationDelay: `${item * 120}ms` }} />)}
      </div>
      <div className="animate-skeleton-pulse h-72 rounded-md bg-white" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
