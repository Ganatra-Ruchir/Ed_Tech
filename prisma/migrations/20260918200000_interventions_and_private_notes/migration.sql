-- Intervention: an action taken when a student needs academic attention.
-- riskLevelAtCreation + reasonsJson snapshot WHY it was raised, so outcomes
-- stay auditable after the student's live risk changes.
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "action" TEXT,
    "notes" TEXT,
    "riskLevelAtCreation" TEXT,
    "reasonsJson" TEXT,
    "followUpAt" DATETIME,
    "outcome" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Intervention_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Intervention_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Intervention_studentId_createdAt_idx" ON "Intervention"("studentId", "createdAt");
CREATE INDEX "Intervention_status_idx" ON "Intervention"("status");
CREATE INDEX "Intervention_raisedById_idx" ON "Intervention"("raisedById");

-- PrivateNote: faculty/CC-only observations. Never exposed to students.
CREATE TABLE "PrivateNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivateNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrivateNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PrivateNote_studentId_createdAt_idx" ON "PrivateNote"("studentId", "createdAt");
