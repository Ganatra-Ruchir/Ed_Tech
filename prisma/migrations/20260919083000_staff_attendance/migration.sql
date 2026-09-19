-- Faculty office check-in / check-out time tracking.
CREATE TABLE "StaffAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facultyId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "checkInAt" DATETIME,
    "checkOutAt" DATETIME,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffAttendance_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StaffAttendance_facultyId_date_key" ON "StaffAttendance"("facultyId", "date");
CREATE INDEX "StaffAttendance_date_idx" ON "StaffAttendance"("date");

-- Singleton row storing the configured office start time used to flag late
-- faculty check-ins (row id is always the literal string 'singleton').
CREATE TABLE "AttendanceSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officeStartTime" TEXT NOT NULL DEFAULT '09:30',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
