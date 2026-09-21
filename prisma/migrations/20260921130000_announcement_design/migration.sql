ALTER TABLE "Announcement" ADD COLUMN "bannerUrl" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "bannerStorageKey" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "backgroundTheme" TEXT NOT NULL DEFAULT 'PLAIN';
