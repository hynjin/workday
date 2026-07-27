-- Run manually only after the owner has signed up and their auth.users UUID has
-- been independently verified. This file is never run by prisma migrate deploy.
--
-- Replace the UUID below. The transaction aborts unless that exact Auth user exists.

BEGIN;

DO $$
DECLARE
  owner_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  IF owner_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION 'Replace owner_id with the verified Supabase Auth UUID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = owner_id) THEN
    RAISE EXCEPTION 'Verified owner does not exist in auth.users';
  END IF;

  UPDATE public."Project" SET "userId" = owner_id WHERE "userId" IS NULL;
  UPDATE public."Workday" SET "userId" = owner_id WHERE "userId" IS NULL;
  UPDATE public."ProductivityGoal"
    SET "userId" = owner_id
    WHERE "userId" IS NULL;

  UPDATE public."Section" child
    SET "userId" = parent."userId"
    FROM public."Project" parent
    WHERE child."projectId" = parent.id AND child."userId" IS NULL;

  UPDATE public."Task" task
    SET "userId" = COALESCE(project."userId", owner_id)
    FROM public."Project" project
    WHERE task."projectId" = project.id AND task."userId" IS NULL;
  UPDATE public."Task"
    SET "userId" = owner_id
    WHERE "projectId" IS NULL AND "userId" IS NULL;

  UPDATE public."RecurrenceRule" child
    SET "userId" = parent."userId"
    FROM public."Task" parent
    WHERE child."taskId" = parent.id AND child."userId" IS NULL;
  UPDATE public."WorkdayItem" child
    SET "userId" = parent."userId"
    FROM public."Workday" parent
    WHERE child."workdayId" = parent.id AND child."userId" IS NULL;
  UPDATE public."FocusSession" child
    SET "userId" = parent."userId"
    FROM public."WorkdayItem" parent
    WHERE child."workdayItemId" = parent.id AND child."userId" IS NULL;
  UPDATE public."ProductivityEvent" event
    SET "userId" = workday."userId"
    FROM public."Workday" workday
    WHERE event."workdayId" = workday.id AND event."userId" IS NULL;
  UPDATE public."ProductivityEvent" event
    SET "userId" = item."userId"
    FROM public."WorkdayItem" item
    WHERE event."workdayItemId" = item.id AND event."userId" IS NULL;
  UPDATE public."ProductivityEvent"
    SET "userId" = owner_id
    WHERE "userId" IS NULL;
  UPDATE public."WeeklyFocusGoal"
    SET "userId" = owner_id
    WHERE "userId" IS NULL;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "userId" FROM public."Project"
      UNION ALL SELECT "userId" FROM public."Section"
      UNION ALL SELECT "userId" FROM public."Task"
      UNION ALL SELECT "userId" FROM public."RecurrenceRule"
      UNION ALL SELECT "userId" FROM public."Workday"
      UNION ALL SELECT "userId" FROM public."WorkdayItem"
      UNION ALL SELECT "userId" FROM public."FocusSession"
      UNION ALL SELECT "userId" FROM public."ProductivityGoal"
      UNION ALL SELECT "userId" FROM public."ProductivityEvent"
      UNION ALL SELECT "userId" FROM public."WeeklyFocusGoal"
    ) owned
    WHERE "userId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Ownership claim incomplete; transaction rolled back';
  END IF;
END
$$;

COMMIT;
