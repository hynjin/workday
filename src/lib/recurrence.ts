import { randomUUID } from "node:crypto";
import { Prisma, type RecurrenceFrequency } from "@prisma/client";
import { prisma } from "./prisma";
import { dateKeyToDate } from "./workday-date";

const DAY_MS = 86_400_000;

export type RecurrencePattern = {
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays: number[];
  monthDay: number | null;
  startsOn: Date;
  endsOn: Date | null;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

function monthsBetween(from: Date, to: Date) {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth();
}

export function occurrenceDateKeys(pattern: RecurrencePattern, fromKey: string, toKey: string) {
  const from = dateKeyToDate(fromKey);
  const to = dateKeyToDate(toKey);
  const start = pattern.startsOn > from ? pattern.startsOn : from;
  const end = pattern.endsOn && pattern.endsOn < to ? pattern.endsOn : to;
  if (start > end) return [];

  const keys: string[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + DAY_MS)) {
    const elapsedDays = daysBetween(pattern.startsOn, cursor);
    if (elapsedDays < 0) continue;

    const matches = pattern.frequency === "daily"
      ? elapsedDays % pattern.interval === 0
      : pattern.frequency === "weekly"
        ? Math.floor(elapsedDays / 7) % pattern.interval === 0 && pattern.weekdays.includes(cursor.getUTCDay())
        : monthsBetween(pattern.startsOn, cursor) % pattern.interval === 0 && cursor.getUTCDate() === pattern.monthDay;
    if (matches) keys.push(dateKey(cursor));
  }
  return keys;
}

type RecurrenceClient = Prisma.TransactionClient | typeof prisma;
type RuleWithTask = Prisma.RecurrenceRuleGetPayload<{ include: { task: true } }>;

async function generateRuleOccurrences(client: RecurrenceClient, rule: RuleWithTask, fromKey: string, toKey: string) {
  const dates = occurrenceDateKeys(rule, fromKey, toKey);
  for (const key of dates) {
    const workday = await client.workday.upsert({
      where: { workdayDate: dateKeyToDate(key) },
      create: { workdayDate: dateKeyToDate(key) },
      update: {},
    });
    if (workday.status === "completed") continue;
    await client.$executeRaw(Prisma.sql`
      INSERT INTO "WorkdayItem" (
        "id", "workdayId", "taskId", "titleSnapshot", "title",
        "recurrenceRuleId", "status", "isKeyTask", "sortOrder", "createdAt"
      )
      VALUES (
        ${randomUUID()}, ${workday.id}, ${rule.taskId}, ${rule.task.title}, ${rule.task.title},
        ${rule.id}, 'planned'::"WorkdayItemStatus", false, 0, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("workdayId", "taskId") DO NOTHING
    `);
  }
}

export async function generateOccurrences({ from, to }: { from: string; to: string }) {
  if (to < from) return;
  const rules = await prisma.recurrenceRule.findMany({
    where: {
      task: { status: "active" },
      startsOn: { lte: dateKeyToDate(to) },
      OR: [{ endsOn: null }, { endsOn: { gte: dateKeyToDate(from) } }],
    },
    include: { task: true },
  });
  for (const rule of rules) {
    await prisma.$transaction(async (tx) => {
      await generateRuleOccurrences(tx, rule, from, to);
      const generatedUntil = !rule.generatedUntil || rule.generatedUntil < dateKeyToDate(to)
        ? dateKeyToDate(to)
        : rule.generatedUntil;
      await tx.recurrenceRule.update({ where: { id: rule.id }, data: { generatedUntil } });
    });
  }
}
