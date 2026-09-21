import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Image from "next/image";

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
    <div className="relative flex min-h-[118px] flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg border border-[#eaded9] bg-[#fffaf8] px-5 py-5 shadow-[0_12px_35px_rgba(83,42,42,0.055)] sm:px-6">
      <Image src="/campus-building.png" alt="" fill className="pointer-events-none object-cover object-center opacity-[0.11]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,248,1)_0%,rgba(255,250,248,0.96)_55%,rgba(255,250,248,0.54)_100%)]" />
      <div className="relative z-10 flex items-center gap-3">
        {Icon && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#8f3032]/10 bg-white/80 text-[#8f3032] shadow-sm">
            <Icon size={24} strokeWidth={1.8} />
          </span>
        )}
        <div>
        {eyebrow && (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f3032]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[24px] font-bold leading-tight text-[#17151a]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#667085]">{description}</p>}
        </div>
      </div>
      {actions && <div className="relative z-10 flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
