import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  icon: Icon,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Small muted label above the title, e.g. a breadcrumb or count */
  eyebrow?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe3dc] pb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#ef5b3f]/[0.08] text-[#9d1836]">
            <Icon size={24} strokeWidth={1.8} />
          </span>
        )}
        <div>
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#ef5b3f]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[22px] font-semibold leading-tight text-[#17212b]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#667085]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
