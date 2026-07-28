-- Preserve the exact pre-migration rows outside the API-exposed public schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS private.backup_0022_focus_session AS
SELECT * FROM public."FocusSession";
CREATE TABLE IF NOT EXISTS private.backup_0022_weekly_focus_goal AS
SELECT * FROM public."WeeklyFocusGoal";
CREATE TABLE IF NOT EXISTS private.backup_0022_project AS
SELECT * FROM public."Project";
CREATE TABLE IF NOT EXISTS private.backup_0022_area AS
SELECT * FROM public."Area";

ALTER TABLE public."FocusSession"
  ADD COLUMN "taskIdSnapshot" TEXT,
  ADD COLUMN "projectIdSnapshot" TEXT,
  ADD COLUMN "areaIdSnapshot" TEXT;

-- IDs are historical identity snapshots, not foreign keys: they must survive
-- later deletion of a Task, Project, or Area.
UPDATE public."FocusSession" fs
SET
  "taskIdSnapshot" = wi."taskId",
  "projectIdSnapshot" = t."projectId",
  "areaIdSnapshot" = COALESCE(p."areaId", t."areaId")
FROM public."WorkdayItem" wi
LEFT JOIN public."Task" t ON t.id = wi."taskId"
LEFT JOIN public."Project" p ON p.id = t."projectId"
WHERE wi.id = fs."workdayItemId";

CREATE INDEX "FocusSession_userId_taskIdSnapshot_idx"
  ON public."FocusSession"("userId", "taskIdSnapshot");
CREATE INDEX "FocusSession_userId_projectIdSnapshot_idx"
  ON public."FocusSession"("userId", "projectIdSnapshot");
CREATE INDEX "FocusSession_userId_areaIdSnapshot_idx"
  ON public."FocusSession"("userId", "areaIdSnapshot");

ALTER TABLE public."WeeklyFocusGoal"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Toronto';

-- The old index was global, so one user's or Area's title could block another.
DROP INDEX IF EXISTS public."Project_title_normalized_key";
CREATE UNIQUE INDEX "Project_user_area_title_normalized_key"
  ON public."Project"(
    "userId",
    COALESCE("areaId", ''),
    LOWER("title")
  )
  WHERE "userId" IS NOT NULL;
CREATE UNIQUE INDEX "Project_legacy_area_title_normalized_key"
  ON public."Project"(
    COALESCE("areaId", ''),
    LOWER("title")
  )
  WHERE "userId" IS NULL;
