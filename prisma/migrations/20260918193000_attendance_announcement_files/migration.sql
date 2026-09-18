CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "checkedInAt" DATETIME,
    "checkedOutAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Attendance_batchId_studentId_date_key" ON "Attendance"("batchId", "studentId", "date");
CREATE INDEX "Attendance_batchId_date_idx" ON "Attendance"("batchId", "date");
CREATE INDEX "Attendance_studentId_date_idx" ON "Attendance"("studentId", "date");

ALTER TABLE "Announcement" ADD COLUMN "attachmentUrl" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "attachmentStorageKey" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "attachmentName" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "attachmentType" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "attachmentSize" INTEGER;