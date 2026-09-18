/** A simple tree-in-circle crest, hand-drawn as inline SVG to approximate a
 * university emblem without depending on an external image asset. Shared
 * across every portal shell (student, faculty, admin). */
export function Crest() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="white" />
      <path
        d="M20 8c-3.5 0-6 2.6-6 5.7 0 1.2.4 2.3 1.1 3.2-1.9.9-3.1 2.7-3.1 4.8 0 2.9 2.3 5.2 5.1 5.3v6.2h5.8v-6.2c2.8-.1 5.1-2.4 5.1-5.3 0-2.1-1.2-3.9-3.1-4.8.7-.9 1.1-2 1.1-3.2C26 10.6 23.5 8 20 8z"
        fill="#6b1029"
      />
    </svg>
  );
}

/** A faint university-building silhouette used as a decorative footer motif. */
export function BuildingSilhouette() {
  return (
    <svg
      viewBox="0 0 220 70"
      className="absolute inset-x-0 bottom-0 h-16 w-full text-white/[0.06]"
      aria-hidden="true"
      fill="currentColor"
    >
      <rect x="0" y="30" width="220" height="40" />
      <rect x="10" y="15" width="14" height="55" />
      <rect x="40" y="22" width="10" height="48" />
      <polygon points="95,0 115,0 125,22 85,22" />
      <rect x="90" y="22" width="30" height="48" />
      <rect x="150" y="18" width="12" height="52" />
      <rect x="185" y="26" width="16" height="44" />
    </svg>
  );
}
