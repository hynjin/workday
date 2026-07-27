CREATE TYPE "AreaStatus" AS ENUM ('active', 'archived');

CREATE TABLE "Area" (
  "id" TEXT NOT NULL,
  "userId" UUID,
  "title" TEXT NOT NULL,
  "status" "AreaStatus" NOT NULL DEFAULT 'active',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "Area_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Area_userId_fkey" FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT
);

ALTER TABLE "Project" ADD COLUMN "areaId" TEXT;
ALTER TABLE "Task" ADD COLUMN "areaId" TEXT;

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_areaId_fkey"
  FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL;
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_areaId_fkey"
  FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL;
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_single_affiliation_check"
  CHECK (NOT ("projectId" IS NOT NULL AND "areaId" IS NOT NULL));

CREATE INDEX "Area_userId_status_idx" ON "Area"("userId", "status");
CREATE INDEX "Project_areaId_status_idx" ON "Project"("areaId", "status");
CREATE INDEX "Task_areaId_status_idx" ON "Task"("areaId", "status");

CREATE OR REPLACE FUNCTION public.enforce_project_area_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  area_user_id uuid;
BEGIN
  IF NEW."areaId" IS NULL THEN RETURN NEW; END IF;
  SELECT "userId" INTO area_user_id FROM public."Area" WHERE id = NEW."areaId";
  IF NOT FOUND THEN RAISE EXCEPTION 'Project area does not exist'; END IF;
  IF NEW."userId" IS DISTINCT FROM area_user_id THEN
    RAISE EXCEPTION 'Project and Area must have the same owner';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Project_enforce_area_owner"
BEFORE INSERT OR UPDATE OF "areaId", "userId" ON "Project"
FOR EACH ROW EXECUTE FUNCTION public.enforce_project_area_owner();

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
    SELECT "userId" INTO parent_user_id FROM public."Task" WHERE id = NEW."parentTaskId";
    IF NOT FOUND THEN RAISE EXCEPTION 'Task parent does not exist'; END IF;
    NEW."userId" := parent_user_id;
  ELSIF NEW."projectId" IS NOT NULL THEN
    SELECT "userId" INTO parent_user_id FROM public."Project" WHERE id = NEW."projectId";
    IF NOT FOUND THEN RAISE EXCEPTION 'Task project does not exist'; END IF;
    NEW."userId" := parent_user_id;
  ELSIF NEW."areaId" IS NOT NULL THEN
    SELECT "userId" INTO parent_user_id FROM public."Area" WHERE id = NEW."areaId";
    IF NOT FOUND THEN RAISE EXCEPTION 'Task area does not exist'; END IF;
    NEW."userId" := parent_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER "Task_enforce_owner" ON "Task";
CREATE TRIGGER "Task_enforce_owner"
BEFORE INSERT OR UPDATE OF "projectId", "areaId", "parentTaskId", "userId" ON "Task"
FOR EACH ROW EXECUTE FUNCTION public.enforce_task_owner();

CREATE OR REPLACE FUNCTION public.enforce_subtask_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  parent_project_id text;
  parent_area_id text;
  parent_section_id text;
  grandparent_id text;
BEGIN
  IF NEW."parentTaskId" IS NULL THEN RETURN NEW; END IF;
  SELECT "projectId", "areaId", "sectionId", "parentTaskId"
    INTO parent_project_id, parent_area_id, parent_section_id, grandparent_id
  FROM public."Task" WHERE id = NEW."parentTaskId";
  IF NOT FOUND THEN RAISE EXCEPTION 'Subtask parent does not exist'; END IF;
  IF grandparent_id IS NOT NULL THEN RAISE EXCEPTION 'Only top-level tasks can have subtasks'; END IF;
  NEW."projectId" := parent_project_id;
  NEW."areaId" := parent_area_id;
  NEW."sectionId" := parent_section_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER "Task_subtask_scope_guard" ON "Task";
CREATE TRIGGER "Task_subtask_scope_guard"
BEFORE INSERT OR UPDATE OF "parentTaskId", "projectId", "areaId", "sectionId" ON "Task"
FOR EACH ROW EXECUTE FUNCTION public.enforce_subtask_scope();

ALTER TABLE public."Area" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Area" FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."Area" TO authenticated;
CREATE POLICY "Area_select_own" ON public."Area"
  FOR SELECT TO authenticated USING ((select auth.uid()) = "userId");
CREATE POLICY "Area_insert_own" ON public."Area"
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = "userId");
CREATE POLICY "Area_update_own" ON public."Area"
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = "userId")
  WITH CHECK ((select auth.uid()) = "userId");
CREATE POLICY "Area_delete_own" ON public."Area"
  FOR DELETE TO authenticated USING ((select auth.uid()) = "userId");

-- Existing Projects and Tasks remain unchanged: all new areaId values are NULL.
