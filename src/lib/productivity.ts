import { Prisma, ProductivityEventType } from "@prisma/client";

export const PRODUCTIVITY_RULE_VERSION = 1;
export const PRODUCTIVITY_POINTS = {
  focus_completed: 2,
  task_completed: 5,
  key_task_completed: 3,
  workday_active: 2,
  weekly_goal_reached: 10,
} satisfies Record<ProductivityEventType, number>;

type Transaction = Prisma.TransactionClient;

export function levelForPoints(points: number) {
  return Math.floor(Math.max(0, points) / 100) + 1;
}

export function pointsIntoLevel(points: number) {
  const safePoints = Math.max(0, points);
  return { current: safePoints % 100, required: 100 };
}

export function weekStart(date: Date) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() - (day === 0 ? 6 : day - 1));
  return result;
}

export function nextUtcDate(date: Date, days = 1) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function streaks(activeDateKeys: string[], todayKey: string) {
  const unique = [...new Set(activeDateKeys)].sort();
  const active = new Set(unique);
  let best = 0, run = 0, previous: Date | null = null;
  for (const key of unique) {
    const current = new Date(`${key}T00:00:00.000Z`);
    run = previous && Math.round((current.getTime() - previous.getTime()) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = current;
  }

  let cursor = new Date(`${todayKey}T00:00:00.000Z`);
  if (!active.has(todayKey)) cursor = nextUtcDate(cursor, -1);
  let current = 0;
  while (active.has(dateKey(cursor))) {
    current += 1;
    cursor = nextUtcDate(cursor, -1);
  }
  return { current, best, activeDays: unique.length };
}

function event(type: ProductivityEventType, dedupeKey: string, workdayId: string | null, workdayItemId: string | null, occurredAt: Date) {
  return {
    type,
    points: PRODUCTIVITY_POINTS[type],
    ruleVersion: PRODUCTIVITY_RULE_VERSION,
    dedupeKey,
    workdayId,
    workdayItemId,
    occurredAt,
  };
}

export async function recordWorkdayActive(tx: Transaction, workdayId: string, occurredAt: Date) {
  await tx.productivityEvent.createMany({
    data: [event("workday_active", `workday_active:${workdayId}`, workdayId, null, occurredAt)],
    skipDuplicates: true,
  });
}

export async function recordTaskCompletion(tx: Transaction, workdayItemId: string, occurredAt: Date) {
  const item = await tx.workdayItem.findUniqueOrThrow({
    where: { id: workdayItemId },
    select: { workdayId: true, isKeyTask: true },
  });
  const events = [event("task_completed", `task_completed:${workdayItemId}`, item.workdayId, workdayItemId, occurredAt)];
  if (item.isKeyTask) events.push(event("key_task_completed", `key_task_completed:${workdayItemId}`, item.workdayId, workdayItemId, occurredAt));
  await tx.productivityEvent.createMany({ data: events, skipDuplicates: true });
}

export async function recordKeyTaskCompletion(tx: Transaction, workdayItemId: string, occurredAt: Date) {
  const item = await tx.workdayItem.findUniqueOrThrow({ where: { id: workdayItemId }, select: { workdayId: true, status: true } });
  if (item.status !== "completed") return;
  await tx.productivityEvent.createMany({
    data: [event("key_task_completed", `key_task_completed:${workdayItemId}`, item.workdayId, workdayItemId, occurredAt)],
    skipDuplicates: true,
  });
}

export async function recordFocusCompletion(tx: Transaction, sessionId: string, occurredAt: Date) {
  const session = await tx.focusSession.findUniqueOrThrow({
    where: { id: sessionId },
    select: { workdayItemId: true, workdayItem: { select: { workdayId: true, workday: { select: { workdayDate: true } } } } },
  });
  const start = weekStart(session.workdayItem.workday.workdayDate);
  const end = nextUtcDate(start, 7);
  const [goal, focus] = await Promise.all([
    tx.weeklyFocusGoal.findFirst({ where: { weekStart: start } }),
    tx.focusSession.aggregate({
      where: {
        endedAt: { not: null },
        workdayItem: { workday: { workdayDate: { gte: start, lt: end } } },
      },
      _sum: { durationSeconds: true },
    }),
  ]);
  const finalFocusSeconds = focus._sum.durationSeconds ?? 0;
  if (!goal || finalFocusSeconds < goal.weeklyFocusMinutes * 60 || goal.achievedAt) return;
  await tx.weeklyFocusGoal.update({
    where: { id: goal.id },
    data: { achievedAt: occurredAt, finalFocusSeconds },
  });
}
