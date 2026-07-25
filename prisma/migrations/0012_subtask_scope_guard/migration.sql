-- Keep every subtask in the same project and section as its top-level parent.
-- This changes no existing rows and protects both Inbox (projectId NULL) and Projects.
CREATE OR REPLACE FUNCTION "enforce_subtask_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_project_id text;
  parent_section_id text;
  grandparent_id text;
BEGIN
  IF NEW."parentTaskId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "projectId", "sectionId", "parentTaskId"
  INTO parent_project_id, parent_section_id, grandparent_id
  FROM "Task"
  WHERE id = NEW."parentTaskId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subtask parent does not exist';
  END IF;
  IF grandparent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only top-level tasks can have subtasks';
  END IF;

  NEW."projectId" := parent_project_id;
  NEW."sectionId" := parent_section_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "Task_subtask_scope_guard" ON "Task";
CREATE TRIGGER "Task_subtask_scope_guard"
BEFORE INSERT OR UPDATE OF "parentTaskId", "projectId", "sectionId"
ON "Task"
FOR EACH ROW
EXECUTE FUNCTION "enforce_subtask_scope"();
