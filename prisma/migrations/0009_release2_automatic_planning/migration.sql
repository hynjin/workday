CREATE TYPE "RecurrenceFrequency" AS ENUM ('daily', 'weekly', 'monthly');

CREATE TABLE "RecurrenceRule" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "frequency" "RecurrenceFrequency" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "monthDay" INTEGER,
  "startsOn" DATE NOT NULL,
  "endsOn" DATE,
  "generatedUntil" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurrenceRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecurrenceRule_interval_check" CHECK ("interval" BETWEEN 1 AND 365),
  CONSTRAINT "RecurrenceRule_weekdays_check" CHECK ("weekdays" <@ ARRAY[0,1,2,3,4,5,6]),
  CONSTRAINT "RecurrenceRule_month_day_check" CHECK ("monthDay" IS NULL OR "monthDay" BETWEEN 1 AND 31),
  CONSTRAINT "RecurrenceRule_date_range_check" CHECK ("endsOn" IS NULL OR "endsOn" >= "startsOn")
);

ALTER TABLE "WorkdayItem" ADD COLUMN "recurrenceRuleId" TEXT;

CREATE UNIQUE INDEX "RecurrenceRule_taskId_key" ON "RecurrenceRule"("taskId");
CREATE INDEX "RecurrenceRule_generatedUntil_idx" ON "RecurrenceRule"("generatedUntil");
CREATE INDEX "WorkdayItem_recurrenceRuleId_idx" ON "WorkdayItem"("recurrenceRuleId");

ALTER TABLE "RecurrenceRule"
  ADD CONSTRAINT "RecurrenceRule_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkdayItem"
  ADD CONSTRAINT "WorkdayItem_recurrenceRuleId_fkey"
  FOREIGN KEY ("recurrenceRuleId") REFERENCES "RecurrenceRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurrenceRule" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "RecurrenceRule" FROM anon, authenticated;
