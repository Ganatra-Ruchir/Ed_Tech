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
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe3dc] pb-5">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#ef5b3f]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[22px] font-semibold leading-tight text-[#17212b]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#667085]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
