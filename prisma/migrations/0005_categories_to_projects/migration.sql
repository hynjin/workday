-- Rename in place so IDs, timestamps and relationships remain intact.
ALTER TABLE "TaskCategory" RENAME TO "Project";
ALTER TABLE "Task" RENAME COLUMN "categoryId" TO "projectId";

ALTER TABLE "Task" DROP CONSTRAINT "Task_categoryId_fkey";
ALTER TABLE "Task" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL;

DROP INDEX "Task_categoryId_status_idx";
CREATE INDEX "Task_projectId_status_idx" ON "Task"("projectId", "status");

DROP INDEX "TaskCategory_title_normalized_key";
CREATE UNIQUE INDEX "Project_title_normalized_key" ON "Project"(LOWER("title"));

DROP INDEX "Task_category_title_normalized_key";
UPDATE "Task" SET "projectId" = NULL WHERE "projectId" = 'legacy-uncategorized';
DELETE FROM "Project" WHERE "id" = 'legacy-uncategorized';

CREATE UNIQUE INDEX "Task_project_title_normalized_key"
  ON "Task"("projectId", LOWER("title"))
  WHERE "projectId" IS NOT NULL;
CREATE UNIQUE INDEX "Task_inbox_title_normalized_key"
  ON "Task"(LOWER("title"))
  WHERE "projectId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Project" WHERE "id" = 'legacy-uncategorized') THEN
    RAISE EXCEPTION 'legacy-uncategorized project was not removed';
  END IF;
  IF EXISTS (SELECT 1 FROM "Task" WHERE "projectId" = 'legacy-uncategorized') THEN
    RAISE EXCEPTION 'legacy inbox tasks were not converted to projectId=null';
  END IF;
END $$;
