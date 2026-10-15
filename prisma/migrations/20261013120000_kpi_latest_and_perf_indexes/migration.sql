-- Performance migration.
--
-- 1. KPILatest: one row per KPI series holding its current value. Previously
--    every "latest value" read loaded the whole append-only KPI log and
--    de-duplicated it in JavaScript, so pages got slower with every review.
-- 2. Composite indexes matching the filters used on every portal page load
--    (notification bell, dashboards, review queue).

-- CreateTable
CREATE TABLE "KPILatest" (
    "key" TEXT NOT NULL,
    "scope" "KPIScope" NOT NULL,
    "batchId" TEXT,
    "studentId" TEXT,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPILatest_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "KPILatest_scope_metricName_idx" ON "KPILatest"("scope", "metricName");
CREATE INDEX "KPILatest_batchId_idx" ON "KPILatest"("batchId");
CREATE INDEX "KPILatest_studentId_idx" ON "KPILatest"("studentId");

-- Backfill: newest row of every series from the existing history log.
INSERT INTO "KPILatest" ("key", "scope", "batchId", "studentId", "metricName", "value", "computedAt")
SELECT DISTINCT ON ("key") "key", "scope", "batchId", "studentId", "metricName", "value", "computedAt"
FROM "KPI"
ORDER BY "key", "computedAt" DESC;

-- Submission: replace single-column indexes with composites (each old index
-- is a left prefix of its replacement, so no query loses index coverage).
DROP INDEX IF EXISTS "Submission_studentId_idx";
DROP INDEX IF EXISTS "Submission_batchId_idx";
DROP INDEX IF EXISTS "Submission_status_idx";
CREATE INDEX "Submission_studentId_status_idx" ON "Submission"("studentId", "status");
CREATE INDEX "Submission_batchId_status_createdAt_idx" ON "Submission"("batchId", "status", "createdAt");
CREATE INDEX "Submission_status_createdAt_idx" ON "Submission"("status", "createdAt");

-- Test: published/due-date filters used by the student dashboard and bell.
DROP INDEX IF EXISTS "Test_batchId_idx";
CREATE INDEX "Test_batchId_publishedAt_dueAt_idx" ON "Test"("batchId", "publishedAt", "dueAt");
