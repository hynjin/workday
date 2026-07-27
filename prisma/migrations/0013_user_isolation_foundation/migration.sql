-- Phase A: add ownership without assigning legacy rows to an unverified user.
-- Existing rows intentionally remain userId = NULL (quarantined).

ALTER TABLE "Project" ADD COLUMN "userId" UUID;
ALTER TABLE "Section" ADD COLUMN "userId" UUID;
ALTER TABLE "Task" ADD COLUMN "userId" UUID;
ALTER TABLE "RecurrenceRule" ADD COLUMN "userId" UUID;
ALTER TABLE "Workday" ADD COLUMN "userId" UUID;
ALTER TABLE "WorkdayItem" ADD COLUMN "userId" UUID;
ALTER TABLE "FocusSession" ADD COLUMN "userId" UUID;
ALTER TABLE "ProductivityGoal" ADD COLUMN "userId" UUID;
ALTER TABLE "ProductivityEvent" ADD COLUMN "userId" UUID;

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE "Section"
  ADD CONSTRAINT "Section_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE "RecurrenceRule"
  ADD CONSTRAINT "RecurrenceRule_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE "Workday"
  ADD CONSTRAINT "Workday_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE "WorkdayItem"
  ADD CONSTRAINT "WorkdayItem_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE "FocusSession"
  ADD CONSTRAINT "FocusSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE "ProductivityGoal"
  ADD CONSTRAINT "ProductivityGoal_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE "ProductivityEvent"
  ADD CONSTRAINT "ProductivityEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT;

CREATE INDEX "Project_userId_status_idx" ON "Project"("userId", "status");
CREATE INDEX "Section_userId_projectId_idx" ON "Section"("userId", "projectId");
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");
CREATE INDEX "RecurrenceRule_userId_generatedUntil_idx"
  ON "RecurrenceRule"("userId", "generatedUntil");
CREATE INDEX "Workday_userId_workdayDate_idx" ON "Workday"("userId", "workdayDate");
CREATE INDEX "WorkdayItem_userId_workdayId_idx" ON "WorkdayItem"("userId", "workdayId");
CREATE INDEX "FocusSession_userId_startedAt_idx" ON "FocusSession"("userId", "startedAt");
CREATE INDEX "ProductivityGoal_userId_idx" ON "ProductivityGoal"("userId");
CREATE INDEX "ProductivityEvent_userId_occurredAt_idx"
  ON "ProductivityEvent"("userId", "occurredAt");

-- Global date and active-session constraints must become tenant-scoped. Separate
-- partial indexes preserve the exact legacy NULL-owner behavior during quarantine.
DROP INDEX "Workday_workdayDate_key";
DROP INDEX "one_active_workday";
DROP INDEX "one_active_focus_session";

CREATE UNIQUE INDEX "Workday_userId_workdayDate_key"
  ON "Workday"("userId", "workdayDate");
CREATE UNIQUE INDEX "Workday_legacy_workdayDate_key"
  ON "Workday"("workdayDate")
  WHERE "userId" IS NULL;
CREATE UNIQUE INDEX "one_active_workday_per_user"
  ON "Workday"("userId")
  WHERE "status" = 'active' AND "userId" IS NOT NULL;
CREATE UNIQUE INDEX "one_active_legacy_workday"
  ON "Workday" ((1))
  WHERE "status" = 'active' AND "userId" IS NULL;
CREATE UNIQUE INDEX "one_active_focus_session_per_user"
  ON "FocusSession"("userId")
  WHERE "endedAt" IS NULL AND "userId" IS NOT NULL;
CREATE UNIQUE INDEX "one_active_legacy_focus_session"
  ON "FocusSession" ((1))
  WHERE "endedAt" IS NULL AND "userId" IS NULL;

-- Child ownership is copied from its authoritative parent and cannot be forged.
CREATE OR REPLACE FUNCTION public.inherit_user_id_from_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  parent_user_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'Section' THEN
    SELECT "userId" INTO parent_user_id FROM public."Project" WHERE id = NEW."projectId";
  ELSIF TG_TABLE_NAME = 'RecurrenceRule' THEN
    SELECT "userId" INTO parent_user_id FROM public."Task" WHERE id = NEW."taskId";
  ELSIF TG_TABLE_NAME = 'WorkdayItem' THEN
    SELECT "userId" INTO parent_user_id FROM public."Workday" WHERE id = NEW."workdayId";
  ELSIF TG_TABLE_NAME = 'FocusSession' THEN
    SELECT "userId" INTO parent_user_id FROM public."WorkdayItem" WHERE id = NEW."workdayItemId";
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ownership parent does not exist';
  END IF;
  NEW."userId" := parent_user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Section_inherit_userId"
BEFORE INSERT OR UPDATE OF "projectId", "userId" ON "Section"
FOR EACH ROW EXECUTE FUNCTION public.inherit_user_id_from_parent();
CREATE TRIGGER "RecurrenceRule_inherit_userId"
BEFORE INSERT OR UPDATE OF "taskId", "userId" ON "RecurrenceRule"
FOR EACH ROW EXECUTE FUNCTION public.inherit_user_id_from_parent();
CREATE TRIGGER "WorkdayItem_inherit_userId"
BEFORE INSERT OR UPDATE OF "workdayId", "userId" ON "WorkdayItem"
FOR EACH ROW EXECUTE FUNCTION public.inherit_user_id_from_parent();
CREATE TRIGGER "FocusSession_inherit_userId"
BEFORE INSERT OR UPDATE OF "workdayItemId", "userId" ON "FocusSession"
FOR EACH ROW EXECUTE FUNCTION public.inherit_user_id_from_parent();

-- Task ownership follows its project or parent. Inbox top-level tasks retain the
-- explicitly authenticated owner supplied by the application.
CREATE OR REPLACE FUNCTION public.enforce_task_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  parent_user_id uuid;
BEGIN
  IF NEW."parentTaskId" IS NOT NULL THEN
    SELECT "userId" INTO parent_user_id
    FROM public."Task" WHERE id = NEW."parentTaskId";
    IF NOT FOUND THEN RAISE EXCEPTION 'Task parent does not exist'; END IF;
    NEW."userId" := parent_user_id;
  ELSIF NEW."projectId" IS NOT NULL THEN
    SELECT "userId" INTO parent_user_id
    FROM public."Project" WHERE id = NEW."projectId";
    IF NOT FOUND THEN RAISE EXCEPTION 'Task project does not exist'; END IF;
    NEW."userId" := parent_user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Task_enforce_owner"
BEFORE INSERT OR UPDATE OF "projectId", "parentTaskId", "userId" ON "Task"
FOR EACH ROW EXECUTE FUNCTION public.enforce_task_owner();

-- Harden the pre-existing subtask trigger identified by the security advisor.
CREATE OR REPLACE FUNCTION public.enforce_subtask_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  parent_project_id text;
  parent_section_id text;
  grandparent_id text;
BEGIN
  IF NEW."parentTaskId" IS NULL THEN RETURN NEW; END IF;
  SELECT "projectId", "sectionId", "parentTaskId"
    INTO parent_project_id, parent_section_id, grandparent_id
  FROM public."Task" WHERE id = NEW."parentTaskId";
  IF NOT FOUND THEN RAISE EXCEPTION 'Subtask parent does not exist'; END IF;
  IF grandparent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only top-level tasks can have subtasks';
  END IF;
  NEW."projectId" := parent_project_id;
  NEW."sectionId" := parent_section_id;
  RETURN NEW;
END;
$$;

-- Direct Data API access is denied unless the authenticated user owns the row.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Project', 'Section', 'Task', 'RecurrenceRule', 'Workday',
    'WorkdayItem', 'FocusSession', 'ProductivityGoal', 'ProductivityEvent'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((select auth.uid()) = "userId")',
      table_name || '_select_own', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = "userId")',
      table_name || '_insert_own', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((select auth.uid()) = "userId") WITH CHECK ((select auth.uid()) = "userId")',
      table_name || '_update_own', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((select auth.uid()) = "userId")',
      table_name || '_delete_own', table_name
    );
  END LOOP;
END
$$;
