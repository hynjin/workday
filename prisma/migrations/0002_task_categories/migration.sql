CREATE TABLE "TaskCategory" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3)
);

INSERT INTO "TaskCategory" ("id", "title") VALUES ('legacy-uncategorized', '미분류');
ALTER TABLE "Task" ADD COLUMN "categoryId" TEXT;
UPDATE "Task" SET "categoryId" = 'legacy-uncategorized';
ALTER TABLE "Task" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory"("id") ON DELETE RESTRICT;
CREATE INDEX "Task_categoryId_status_idx" ON "Task"("categoryId", "status");

WITH ranked AS (
  SELECT "id", FIRST_VALUE("id") OVER (PARTITION BY "categoryId", LOWER("title") ORDER BY CASE WHEN "status" = 'active' THEN 0 ELSE 1 END, "createdAt") AS keeper
  FROM "Task"
), duplicates AS (
  SELECT "id", keeper FROM ranked WHERE "id" <> keeper
)
UPDATE "WorkdayItem" item SET "taskId" = duplicates.keeper FROM duplicates WHERE item."taskId" = duplicates."id";
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "categoryId", LOWER("title") ORDER BY CASE WHEN "status" = 'active' THEN 0 ELSE 1 END, "createdAt") AS position
  FROM "Task"
)
DELETE FROM "Task" task USING ranked WHERE task."id" = ranked."id" AND ranked.position > 1;

CREATE UNIQUE INDEX "TaskCategory_title_normalized_key" ON "TaskCategory" (LOWER("title"));
CREATE UNIQUE INDEX "Task_category_title_normalized_key" ON "Task" ("categoryId", LOWER("title"));
