import { prisma } from "./prisma";
import { dateKeyToDate, getBoundaryInstant, getWorkdayDate } from "./workday-date";

export async function getOrCreateCurrentWorkday() {
  const key = getWorkdayDate();
  const date = dateKeyToDate(key);
  const active = await prisma.workday.findFirst({ where: { status: "active" } });
  if (active?.workdayDate.getTime() === date.getTime()) return active;
  if (active) {
    const boundary = getBoundaryInstant(key);
    await prisma.$transaction(async (tx) => {
      const session = await tx.focusSession.findFirst({ where: { endedAt: null, workdayItem: { workdayId: active.id } } });
      if (session) {
        const endedAt = boundary > session.startedAt ? boundary : session.startedAt;
        await tx.focusSession.update({ where: { id: session.id }, data: { endedAt, durationSeconds: Math.max(0, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)) } });
      }
      const endedAt = active.startedAt && active.startedAt > boundary ? active.startedAt : boundary;
      await tx.workday.update({ where: { id: active.id }, data: { status: "completed", endedAt } });
    });
  }
  const existing = await prisma.workday.findUnique({ where: { workdayDate: date } });
  if (existing?.status === "completed") {
    const itemCount = await prisma.workdayItem.count({ where: { workdayId: existing.id } });
    return prisma.workday.update({ where: { id: existing.id }, data: { status: itemCount || existing.startedAt ? "active" : "planning", endedAt: null } });
  }
  return existing ?? prisma.workday.create({ data: { workdayDate: date } });
}

export async function getOrCreateWorkdayForDate(key: string) {
  const currentKey = getWorkdayDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || key < currentKey) throw new Error("오늘 이후의 날짜만 계획할 수 있습니다.");
  if (key === currentKey) return getOrCreateCurrentWorkday();
  const workdayDate = dateKeyToDate(key);
  return prisma.workday.upsert({ where: { workdayDate }, create: { workdayDate }, update: {} });
}

export async function getWorkdayView(id: string) {
  const workday = await prisma.workday.findUniqueOrThrow({
    where: { id }, include: { items: { orderBy: { createdAt: "asc" }, include: { focusSessions: true, task: { include: { category: true } } } } },
  });
  const now = Date.now();
  const items = workday.items.map((item) => {
    const seconds = item.focusSessions.reduce((sum, session) => sum + (session.durationSeconds ?? (session.endedAt ? 0 : Math.max(0, Math.floor((now - session.startedAt.getTime()) / 1000)))), 0);
    return { ...item, seconds, sessionCount: item.focusSessions.length, categoryTitle: item.task?.category.title ?? null, focusSessions: undefined, task: undefined };
  });
  return { ...workday, items, totalSeconds: items.reduce((sum, item) => sum + item.seconds, 0), totalSessions: items.reduce((sum, item) => sum + item.sessionCount, 0) };
}
