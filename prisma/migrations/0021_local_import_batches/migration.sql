CREATE TYPE "LocalImportStatus" AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE "LocalEntityType" AS ENUM ('task', 'workdayItem', 'focusSession');

CREATE TABLE "LocalImportBatch" (
  "id" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "deviceId" TEXT NOT NULL,
  "status" "LocalImportStatus" NOT NULL DEFAULT 'processing',
  "counts" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "LocalImportBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LocalImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT
);

CREATE TABLE "ImportedLocalRecord" (
  "id" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "deviceId" TEXT NOT NULL,
  "localId" TEXT NOT NULL,
  "entityType" "LocalEntityType" NOT NULL,
  "cloudId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportedLocalRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportedLocalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT "ImportedLocalRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "LocalImportBatch"("id") ON DELETE RESTRICT
);

CREATE INDEX "LocalImportBatch_userId_createdAt_idx" ON "LocalImportBatch"("userId", "createdAt");
CREATE INDEX "LocalImportBatch_userId_deviceId_idx" ON "LocalImportBatch"("userId", "deviceId");
CREATE UNIQUE INDEX "ImportedLocalRecord_userId_deviceId_entityType_localId_key"
  ON "ImportedLocalRecord"("userId", "deviceId", "entityType", "localId");
CREATE INDEX "ImportedLocalRecord_batchId_idx" ON "ImportedLocalRecord"("batchId");
CREATE INDEX "ImportedLocalRecord_userId_importedAt_idx" ON "ImportedLocalRecord"("userId", "importedAt");

ALTER TABLE "LocalImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportedLocalRecord" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LocalImportBatch", "ImportedLocalRecord" FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "LocalImportBatch", "ImportedLocalRecord" TO authenticated;

CREATE POLICY "LocalImportBatch_select_own" ON "LocalImportBatch" FOR SELECT TO authenticated
  USING ((select auth.uid()) = "userId");
CREATE POLICY "LocalImportBatch_insert_own" ON "LocalImportBatch" FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = "userId");
CREATE POLICY "LocalImportBatch_update_own" ON "LocalImportBatch" FOR UPDATE TO authenticated
  USING ((select auth.uid()) = "userId") WITH CHECK ((select auth.uid()) = "userId");
CREATE POLICY "LocalImportBatch_delete_own" ON "LocalImportBatch" FOR DELETE TO authenticated
  USING ((select auth.uid()) = "userId");

CREATE POLICY "ImportedLocalRecord_select_own" ON "ImportedLocalRecord" FOR SELECT TO authenticated
  USING ((select auth.uid()) = "userId");
CREATE POLICY "ImportedLocalRecord_insert_own" ON "ImportedLocalRecord" FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = "userId");
CREATE POLICY "ImportedLocalRecord_update_own" ON "ImportedLocalRecord" FOR UPDATE TO authenticated
  USING ((select auth.uid()) = "userId") WITH CHECK ((select auth.uid()) = "userId");
CREATE POLICY "ImportedLocalRecord_delete_own" ON "ImportedLocalRecord" FOR DELETE TO authenticated
  USING ((select auth.uid()) = "userId");
