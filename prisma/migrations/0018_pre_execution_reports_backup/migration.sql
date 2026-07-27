CREATE SCHEMA IF NOT EXISTS migration_backup_execution_20260728;
REVOKE ALL ON SCHEMA migration_backup_execution_20260728 FROM PUBLIC, anon, authenticated;

CREATE TABLE migration_backup_execution_20260728."Area" AS TABLE public."Area";
CREATE TABLE migration_backup_execution_20260728."Project" AS TABLE public."Project";
CREATE TABLE migration_backup_execution_20260728."Task" AS TABLE public."Task";
CREATE TABLE migration_backup_execution_20260728."Workday" AS TABLE public."Workday";
CREATE TABLE migration_backup_execution_20260728."WorkdayItem" AS TABLE public."WorkdayItem";
CREATE TABLE migration_backup_execution_20260728."FocusSession" AS TABLE public."FocusSession";

CREATE TABLE migration_backup_execution_20260728.manifest (
  entity text PRIMARY KEY,
  row_count bigint NOT NULL,
  row_hash text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Area','Project','Task','Workday','WorkdayItem','FocusSession']
  LOOP
    EXECUTE format(
      'INSERT INTO migration_backup_execution_20260728.manifest(entity,row_count,row_hash)
       SELECT %L,count(*),md5(coalesce(string_agg(to_jsonb(t)::text, '''' ORDER BY id),''''))
       FROM public.%I t',
      table_name, table_name
    );
  END LOOP;
END $$;
