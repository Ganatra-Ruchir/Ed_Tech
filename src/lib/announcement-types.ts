/** Plain DTOs for the announcement/class-stream feature. UI components type
 * against these rather than Prisma's generated types, so the entire UI layer
 * compiles independently of `prisma generate`. Only the server data layer
 * (announcements.ts) touches the Prisma client. */

export const ANNOUNCEMENT_CATEGORIES = [
  { value: "IMPORTANT", label: "Important", tone: "rose" },
  { value: "ACADEMIC", label: "Academic", tone: "indigo" },
  { value: "ASSIGNMENT", label: "Assignment", tone: "violet" },
  { value: "EVENT", label: "Event", tone: "emerald" },
  { value: "GENERAL", label: "General", tone: "zinc" },
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number]["value"];

export const ANNOUNCEMENT_BACKGROUNDS = [
  { value: "PLAIN", label: "White", swatch: "bg-white", surface: "bg-white", dark: false },
  { value: "CORAL", label: "Coral", swatch: "bg-[#ef5b3f]", surface: "bg-[#fff1ec]", dark: false },
  { value: "SKY", label: "Sky", swatch: "bg-[#68a9c4]", surface: "bg-[#eef7fb]", dark: false },
  { value: "MINT", label: "Mint", swatch: "bg-[#5a9b76]", surface: "bg-[#eef8f2]", dark: false },
  { value: "LILAC", label: "Lilac", swatch: "bg-[#8b78a8]", surface: "bg-[#f4f0fa]", dark: false },
  { value: "INK", label: "Ink", swatch: "bg-[#17212b]", surface: "bg-[#17212b]", dark: true },
] as const;

export type AnnouncementBackground = (typeof ANNOUNCEMENT_BACKGROUNDS)[number]["value"];

export type AnnouncementComment = {
  id: string;
  authorName: string;
  authorImageUrl: string | null;
  body: string;
  createdAt: string;
};

export type AnnouncementDTO = {
  id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  requireAck: boolean;
  allowComments: boolean;
  bannerUrl: string | null;
  backgroundTheme: string;
  batchId: string;
  batchName: string;
  facultyName: string;
  facultyImageUrl: string | null;
  createdAt: string;
  attachment: { url: string; name: string; type: string; size: number } | null;
  /** Recipient totals — computed from receipts. */
  audienceCount: number;
  seenCount: number;
  acknowledgedCount: number;
  /** Whether the *current viewer* has acknowledged (students). */
  viewerAcknowledged: boolean;
  comments: AnnouncementComment[];
};

export function categoryMeta(value: string) {
  return ANNOUNCEMENT_CATEGORIES.find((c) => c.value === value) ?? ANNOUNCEMENT_CATEGORIES[4];
}

export function backgroundMeta(value: string) {
  return ANNOUNCEMENT_BACKGROUNDS.find((background) => background.value === value) ?? ANNOUNCEMENT_BACKGROUNDS[0];
}
