ALTER TABLE "WorkdayItem"
  ADD COLUMN "dailyGoalMinutes" INTEGER,
  ADD COLUMN "dismissedAt" TIMESTAMP(3),
  ADD CONSTRAINT "WorkdayItem_dailyGoalMinutes_check"
    CHECK ("dailyGoalMinutes" IS NULL OR ("dailyGoalMinutes" >= 1 AND "dailyGoalMinutes" <= 1440));

ALTER TABLE "FocusSession"
  ADD COLUMN "taskTitleSnapshot" TEXT,
  ADD COLUMN "projectTitleSnapshot" TEXT,
  ADD COLUMN "areaTitleSnapshot" TEXT;

UPDATE "FocusSession" fs
SET
  "taskTitleSnapshot" = wi."titleSnapshot",
  "projectTitleSnapshot" = p.title,
  "areaTitleSnapshot" = COALESCE(pa.title, ta.title)
FROM "WorkdayItem" wi
LEFT JOIN "Task" t ON t.id = wi."taskId"
LEFT JOIN "Project" p ON p.id = t."projectId"
LEFT JOIN "Area" pa ON pa.id = p."areaId"
LEFT JOIN "Area" ta ON ta.id = t."areaId"
WHERE fs."workdayItemId" = wi.id;

CREATE INDEX "WorkdayItem_userId_dismissedAt_idx"
  ON "WorkdayItem"("userId", "dismissedAt");
CREATE INDEX "FocusSession_userId_taskTitleSnapshot_idx"
  ON "FocusSession"("userId", "taskTitleSnapshot");
