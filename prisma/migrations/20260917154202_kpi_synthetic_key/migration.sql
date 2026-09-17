/*
  Warnings:

  - Added the required column `key` to the `KPI` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "batchId" TEXT,
    "studentId" TEXT,
    "metricName" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KPI_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_KPI" ("batchId", "computedAt", "id", "metricName", "scope", "studentId", "value") SELECT "batchId", "computedAt", "id", "metricName", "scope", "studentId", "value" FROM "KPI";
DROP TABLE "KPI";
ALTER TABLE "new_KPI" RENAME TO "KPI";
CREATE UNIQUE INDEX "KPI_key_key" ON "KPI"("key");
CREATE INDEX "KPI_batchId_idx" ON "KPI"("batchId");
CREATE INDEX "KPI_studentId_idx" ON "KPI"("studentId");
CREATE INDEX "KPI_metricName_idx" ON "KPI"("metricName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
