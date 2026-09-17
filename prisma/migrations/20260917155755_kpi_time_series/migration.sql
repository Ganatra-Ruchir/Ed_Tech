-- DropIndex
DROP INDEX "KPI_key_key";

-- CreateIndex
CREATE INDEX "KPI_key_computedAt_idx" ON "KPI"("key", "computedAt");
