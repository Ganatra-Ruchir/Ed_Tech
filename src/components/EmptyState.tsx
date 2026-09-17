import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      {Icon && (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
          <Icon size={16} />
        </span>
      )}
      <p className="text-sm font-medium text-zinc-600">{title}</p>
      {description && <p className="max-w-xs text-xs text-zinc-400">{description}</p>}
    </div>
  );
}
