CREATE TYPE "ProductivityEventType" AS ENUM (
  'focus_completed',
  'task_completed',
  'key_task_completed',
  'workday_active',
  'weekly_goal_reached'
);

CREATE TABLE "ProductivityEvent" (
  "id" TEXT NOT NULL,
  "type" "ProductivityEventType" NOT NULL,
  "points" INTEGER NOT NULL,
  "ruleVersion" INTEGER NOT NULL DEFAULT 1,
  "dedupeKey" TEXT NOT NULL,
  "workdayId" TEXT,
  "workdayItemId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductivityEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductivityEvent_points_check" CHECK ("points" >= 0),
  CONSTRAINT "ProductivityEvent_rule_version_check" CHECK ("ruleVersion" > 0)
);

CREATE TABLE "ProductivityGoal" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "weeklyFocusMinutes" INTEGER NOT NULL DEFAULT 300,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductivityGoal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductivityGoal_weekly_focus_check" CHECK ("weeklyFocusMinutes" BETWEEN 30 AND 10080)
);

CREATE UNIQUE INDEX "ProductivityEvent_dedupeKey_key" ON "ProductivityEvent"("dedupeKey");
CREATE INDEX "ProductivityEvent_occurredAt_idx" ON "ProductivityEvent"("occurredAt");
CREATE INDEX "ProductivityEvent_type_occurredAt_idx" ON "ProductivityEvent"("type", "occurredAt");
CREATE INDEX "ProductivityEvent_workdayId_idx" ON "ProductivityEvent"("workdayId");
CREATE INDEX "ProductivityEvent_workdayItemId_idx" ON "ProductivityEvent"("workdayItemId");

ALTER TABLE "ProductivityEvent"
  ADD CONSTRAINT "ProductivityEvent_workdayId_fkey"
  FOREIGN KEY ("workdayId") REFERENCES "Workday"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductivityEvent"
  ADD CONSTRAINT "ProductivityEvent_workdayItemId_fkey"
  FOREIGN KEY ("workdayItemId") REFERENCES "WorkdayItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductivityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductivityGoal" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ProductivityEvent" FROM anon, authenticated;
REVOKE ALL ON TABLE "ProductivityGoal" FROM anon, authenticated;

INSERT INTO "ProductivityGoal" ("id", "weeklyFocusMinutes", "createdAt", "updatedAt")
VALUES ('default', 300, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Backfill the event ledger without changing any historical task, workday, or focus rows.
INSERT INTO "ProductivityEvent"
  ("id", "type", "points", "ruleVersion", "dedupeKey", "workdayId", "workdayItemId", "occurredAt")
SELECT
  'backfill-task-' || wi.id,
  'task_completed'::"ProductivityEventType",
  5,
  1,
  'task_completed:' || wi.id,
  wi."workdayId",
  wi.id,
  COALESCE(wi."completedAt", wi."createdAt")
FROM "WorkdayItem" wi
WHERE wi.status = 'completed'
ON CONFLICT ("dedupeKey") DO NOTHING;

INSERT INTO "ProductivityEvent"
  ("id", "type", "points", "ruleVersion", "dedupeKey", "workdayId", "workdayItemId", "occurredAt")
SELECT
  'backfill-key-' || wi.id,
  'key_task_completed'::"ProductivityEventType",
  3,
  1,
  'key_task_completed:' || wi.id,
  wi."workdayId",
  wi.id,
  COALESCE(wi."completedAt", wi."createdAt")
FROM "WorkdayItem" wi
WHERE wi.status = 'completed' AND wi."isKeyTask" = true
ON CONFLICT ("dedupeKey") DO NOTHING;

INSERT INTO "ProductivityEvent"
  ("id", "type", "points", "ruleVersion", "dedupeKey", "workdayId", "workdayItemId", "occurredAt")
SELECT
  'backfill-focus-' || fs.id,
  'focus_completed'::"ProductivityEventType",
  2,
  1,
  'focus_completed:' || fs.id,
  wi."workdayId",
  wi.id,
  COALESCE(fs."endedAt", fs."startedAt")
FROM "FocusSession" fs
JOIN "WorkdayItem" wi ON wi.id = fs."workdayItemId"
WHERE fs."endedAt" IS NOT NULL
ON CONFLICT ("dedupeKey") DO NOTHING;

INSERT INTO "ProductivityEvent"
  ("id", "type", "points", "ruleVersion", "dedupeKey", "workdayId", "occurredAt")
SELECT
  'backfill-workday-' || w.id,
  'workday_active'::"ProductivityEventType",
  2,
  1,
  'workday_active:' || w.id,
  w.id,
  COALESCE(w."startedAt", w."createdAt")
FROM "Workday" w
WHERE w."startedAt" IS NOT NULL
ON CONFLICT ("dedupeKey") DO NOTHING;
