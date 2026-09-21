CREATE TABLE "CalendarEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "eventDate" TEXT NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "location" TEXT,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CalendarEvent_eventDate_idx" ON "CalendarEvent"("eventDate");
CREATE INDEX "CalendarEvent_createdById_idx" ON "CalendarEvent"("createdById");
