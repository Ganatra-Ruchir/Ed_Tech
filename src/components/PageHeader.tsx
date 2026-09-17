import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Small muted label above the title, e.g. a breadcrumb or count */
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[15px] font-semibold text-zinc-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
