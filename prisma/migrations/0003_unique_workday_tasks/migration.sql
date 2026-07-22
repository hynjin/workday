WITH ranked AS (
  SELECT "id", FIRST_VALUE("id") OVER (PARTITION BY "workdayId", "taskId" ORDER BY "createdAt") AS keeper
  FROM "WorkdayItem"
  WHERE "taskId" IS NOT NULL
), duplicates AS (
  SELECT "id", keeper FROM ranked WHERE "id" <> keeper
)
UPDATE "FocusSession" session SET "workdayItemId" = duplicates.keeper FROM duplicates WHERE session."workdayItemId" = duplicates."id";

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "workdayId", "taskId" ORDER BY "createdAt") AS position
  FROM "WorkdayItem"
  WHERE "taskId" IS NOT NULL
)
DELETE FROM "WorkdayItem" item USING ranked WHERE item."id" = ranked."id" AND ranked.position > 1;

CREATE UNIQUE INDEX "WorkdayItem_workdayId_taskId_key" ON "WorkdayItem"("workdayId", "taskId");
