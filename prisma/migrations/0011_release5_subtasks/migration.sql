ALTER TABLE "Task" ADD COLUMN "parentTaskId" TEXT;

DROP INDEX "Task_project_title_normalized_key";
DROP INDEX "Task_inbox_title_normalized_key";

CREATE UNIQUE INDEX "Task_project_title_normalized_key"
  ON "Task"("projectId", LOWER("title"))
  WHERE "projectId" IS NOT NULL AND "parentTaskId" IS NULL;

CREATE UNIQUE INDEX "Task_inbox_title_normalized_key"
  ON "Task"(LOWER("title"))
  WHERE "projectId" IS NULL AND "parentTaskId" IS NULL;

CREATE UNIQUE INDEX "Task_parent_title_normalized_key"
  ON "Task"("parentTaskId", LOWER("title"))
  WHERE "parentTaskId" IS NOT NULL;

CREATE INDEX "Task_parentTaskId_status_idx" ON "Task"("parentTaskId", "status");

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_parentTaskId_fkey"
  FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_not_own_parent_check"
  CHECK ("parentTaskId" IS NULL OR "parentTaskId" <> "id");
