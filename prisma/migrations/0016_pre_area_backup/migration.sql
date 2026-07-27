-- Private, immutable baseline immediately before introducing Areas.
-- This preserves both quarantined legacy rows and rows owned by current users.
CREATE SCHEMA IF NOT EXISTS migration_backup_areas_20260727;
REVOKE ALL ON SCHEMA migration_backup_areas_20260727 FROM PUBLIC, anon, authenticated;

CREATE TABLE migration_backup_areas_20260727."Project" AS TABLE public."Project";
CREATE TABLE migration_backup_areas_20260727."Section" AS TABLE public."Section";
CREATE TABLE migration_backup_areas_20260727."Task" AS TABLE public."Task";
CREATE TABLE migration_backup_areas_20260727."RecurrenceRule" AS TABLE public."RecurrenceRule";
CREATE TABLE migration_backup_areas_20260727."Workday" AS TABLE public."Workday";
CREATE TABLE migration_backup_areas_20260727."WorkdayItem" AS TABLE public."WorkdayItem";
CREATE TABLE migration_backup_areas_20260727."FocusSession" AS TABLE public."FocusSession";
CREATE TABLE migration_backup_areas_20260727."ProductivityGoal" AS TABLE public."ProductivityGoal";
CREATE TABLE migration_backup_areas_20260727."ProductivityEvent" AS TABLE public."ProductivityEvent";
CREATE TABLE migration_backup_areas_20260727."WeeklyFocusGoal" AS TABLE public."WeeklyFocusGoal";

CREATE TABLE migration_backup_areas_20260727.manifest (
  entity text PRIMARY KEY,
  row_count bigint NOT NULL,
  row_hash text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Project', 'Section', 'Task', 'RecurrenceRule', 'Workday',
    'WorkdayItem', 'FocusSession', 'ProductivityGoal',
    'ProductivityEvent', 'WeeklyFocusGoal'
  ]
  LOOP
    EXECUTE format(
      'INSERT INTO migration_backup_areas_20260727.manifest(entity, row_count, row_hash)
       SELECT %L, count(*), md5(coalesce(string_agg(to_jsonb(t)::text, '''' ORDER BY id), ''''))
       FROM public.%I t',
      table_name, table_name
    );
  END LOOP;
END
$$;
