-- Expand first: preserve the legacy title column until a later release.
ALTER TABLE "WorkdayItem" ADD COLUMN "titleSnapshot" TEXT;

UPDATE "WorkdayItem"
SET "titleSnapshot" = "title"
WHERE "titleSnapshot" IS NULL;

ALTER TABLE "WorkdayItem" ALTER COLUMN "titleSnapshot" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "WorkdayItem" WHERE "titleSnapshot" <> "title") THEN
    RAISE EXCEPTION 'WorkdayItem title snapshot backfill failed';
  END IF;
END $$;
