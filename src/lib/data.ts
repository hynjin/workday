import { prisma } from "./prisma";
import { dateKeyToDate, getWorkdayDate, nextDate } from "./workday-date";

export async function getOrCreateCurrentWorkday() {
  const active = await prisma.workday.findFirst({ where: { status: "active" } });
  if (active) return active;
  const planning = await prisma.workday.findFirst({ where: { status: "planning" }, orderBy: { workdayDate: "asc" } });
  if (planning) return planning;
  const date = dateKeyToDate(getWorkdayDate());
  const existing = await prisma.workday.findUnique({ where: { workdayDate: date } });
  if (!existing) return prisma.workday.create({ data: { workdayDate: date } });
  const latest = await prisma.workday.findFirst({ orderBy: { workdayDate: "desc" } });
  return prisma.workday.create({ data: { workdayDate: nextDate(latest?.workdayDate ?? existing.workdayDate) } });
}

export async function getWorkdayView(id: string) {
  const workday = await prisma.workday.findUniqueOrThrow({
    where: { id }, include: { items: { orderBy: { createdAt: "asc" }, include: { focusSessions: true } } },
  });
  const now = Date.now();
  const items = workday.items.map((item) => {
    const seconds = item.focusSessions.reduce((sum, session) => sum + (session.durationSeconds ?? (session.endedAt ? 0 : Math.max(0, Math.floor((now - session.startedAt.getTime()) / 1000)))), 0);
    return { ...item, seconds, focusSessions: undefined };
  });
  return { ...workday, items, totalSeconds: items.reduce((sum, item) => sum + item.seconds, 0) };
}
