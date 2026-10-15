import Image from "next/image";

export function Crest() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm"
      aria-label="Silver Oak University"
    >
      <Image src="/silver-oak-logo.png" alt="Silver Oak University" width={36} height={36} className="h-full w-full object-contain" priority />
    </span>
  );
}
