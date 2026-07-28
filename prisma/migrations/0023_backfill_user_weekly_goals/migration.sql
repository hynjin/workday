-- Reuse each authenticated user's legacy current setting as this week's first
-- immutable weekly goal. Historical weeks are not fabricated.
INSERT INTO public."WeeklyFocusGoal"
  ("id", "userId", "weekStart", "weeklyFocusMinutes", "timezone", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  pg."userId",
  date_trunc('week', CURRENT_DATE)::date,
  pg."weeklyFocusMinutes",
  'America/Toronto',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM public."ProductivityGoal" pg
WHERE pg."userId" IS NOT NULL
ON CONFLICT DO NOTHING;
