CREATE TABLE "WeeklyFocusGoal" (
  "id" TEXT NOT NULL,
  "userId" UUID,
  "weekStart" DATE NOT NULL,
  "weeklyFocusMinutes" INTEGER NOT NULL,
  "achievedAt" TIMESTAMP(3),
  "finalFocusSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeeklyFocusGoal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WeeklyFocusGoal_minutes_check"
    CHECK ("weeklyFocusMinutes" BETWEEN 30 AND 10080),
  CONSTRAINT "WeeklyFocusGoal_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE RESTRICT
);

CREATE INDEX "WeeklyFocusGoal_userId_weekStart_idx"
  ON "WeeklyFocusGoal"("userId", "weekStart");
CREATE UNIQUE INDEX "WeeklyFocusGoal_user_week_key"
  ON "WeeklyFocusGoal"("userId", "weekStart") WHERE "userId" IS NOT NULL;
CREATE UNIQUE INDEX "WeeklyFocusGoal_legacy_week_key"
  ON "WeeklyFocusGoal"("weekStart") WHERE "userId" IS NULL;

-- Seed only the migration week. Earlier weeks had no immutable goal snapshots, so
-- they are not fabricated retroactively.
INSERT INTO "WeeklyFocusGoal"
  ("id", "userId", "weekStart", "weeklyFocusMinutes", "createdAt", "updatedAt")
SELECT
  'legacy-' || to_char(
    date_trunc('week', CURRENT_DATE)::date, 'YYYY-MM-DD'
  ),
  NULL,
  date_trunc('week', CURRENT_DATE)::date,
  "weeklyFocusMinutes",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ProductivityGoal"
WHERE "id" = 'default'
ON CONFLICT DO NOTHING;

ALTER TABLE "WeeklyFocusGoal" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WeeklyFocusGoal" FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "WeeklyFocusGoal" TO authenticated;
CREATE POLICY "WeeklyFocusGoal_select_own" ON "WeeklyFocusGoal"
  FOR SELECT TO authenticated USING ((select auth.uid()) = "userId");
CREATE POLICY "WeeklyFocusGoal_insert_own" ON "WeeklyFocusGoal"
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = "userId");
CREATE POLICY "WeeklyFocusGoal_update_own" ON "WeeklyFocusGoal"
  FOR UPDATE TO authenticated USING ((select auth.uid()) = "userId")
  WITH CHECK ((select auth.uid()) = "userId");
CREATE POLICY "WeeklyFocusGoal_delete_own" ON "WeeklyFocusGoal"
  FOR DELETE TO authenticated USING ((select auth.uid()) = "userId");
