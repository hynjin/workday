import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const date = new Date("2099-12-30T00:00:00.000Z");
const nextDate = new Date("2099-12-31T00:00:00.000Z");

async function verify() {
  const task = await prisma.task.create({ data: { title: "흐름 검증 작업" } });
  const workday = await prisma.workday.create({ data: { workdayDate: date } });
  try {
    const focusedItem = await prisma.workdayItem.create({ data: { workdayId: workday.id, taskId: task.id, title: "집중 세션 검증" } });
    const carrySource = await prisma.workdayItem.create({ data: { workdayId: workday.id, title: "이월 검증" } });
    await prisma.workday.update({ where: { id: workday.id }, data: { status: "active", startedAt: new Date() } });

    const session = await prisma.focusSession.create({ data: { workdayItemId: focusedItem.id } });
    let duplicateBlocked = false;
    try { await prisma.focusSession.create({ data: { workdayItemId: carrySource.id } }); }
    catch { duplicateBlocked = true; }
    if (!duplicateBlocked) throw new Error("동시 활성 세션 제약이 동작하지 않습니다.");

    await prisma.focusSession.update({ where: { id: session.id }, data: { endedAt: new Date(), durationSeconds: 1 } });
    await prisma.workdayItem.update({ where: { id: focusedItem.id }, data: { status: "completed", completedAt: new Date() } });

    const target = await prisma.workday.create({ data: { workdayDate: nextDate } });
    const carried = await prisma.workdayItem.create({ data: { workdayId: target.id, title: carrySource.title, carriedFromItemId: carrySource.id } });
    const carriedSessions = await prisma.focusSession.count({ where: { workdayItemId: carried.id } });
    if (carriedSessions !== 0) throw new Error("이월 항목에 이전 집중 시간이 포함되었습니다.");

    await prisma.workday.update({ where: { id: workday.id }, data: { status: "completed", endedAt: new Date() } });
    console.log("준비 → 시작 → 집중 → 완료 → 이월 → 종료 흐름 검증 통과");
  } finally {
    await prisma.workday.deleteMany({ where: { workdayDate: { in: [date, nextDate] } } });
    await prisma.task.delete({ where: { id: task.id } });
  }
}

verify().finally(() => prisma.$disconnect());
