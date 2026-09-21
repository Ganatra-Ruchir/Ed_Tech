import Image from "next/image";

export function Crest() {
  return (
    <span className="animate-brand-breathe flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm" aria-label="Silver Oak University">
      <Image src="/silver-oak-logo.png" alt="Silver Oak University" width={36} height={36} className="h-full w-full object-contain" priority />
    </span>
  );
}

export function BuildingSilhouette() {
  return (
    <div className="absolute inset-x-5 bottom-0 grid h-12 grid-cols-6 items-end gap-1 opacity-[0.04]" aria-hidden="true">
      {[40, 75, 55, 100, 65, 35].map((height, index) => (
        <span
          key={index}
          className="animate-building-rise bg-white"
          style={{ height: `${height}%`, animationDelay: `${index * 320}ms` }}
        />
      ))}
    </div>
  );
}
