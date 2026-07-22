import { PrismaClient } from "@prisma/client";
import { dateKeyToDate, getWorkdayDate } from "../src/lib/workday-date";

const prisma = new PrismaClient();
const templates = [
  [{ title: "영어 듣기 30분", completed: true, seconds: 1920 }, { title: "문서 정리", completed: false, seconds: 3300 }],
  [{ title: "인터뷰 답변 정리", completed: true, seconds: 6300 }, { title: "세금 서류 확인", completed: true, seconds: 1500 }],
];

async function main() {
  const cursor = dateKeyToDate(getWorkdayDate());
  let created = 0, daysBack = 1;
  while (created < templates.length && daysBack < 30) {
    const date = new Date(cursor);
    date.setUTCDate(date.getUTCDate() - daysBack++);
    if (await prisma.workday.findUnique({ where: { workdayDate: date } })) continue;
    const startedAt = new Date(date.getTime() + 14 * 60 * 60 * 1000);
    const endedAt = new Date(date.getTime() + 22 * 60 * 60 * 1000);
    await prisma.workday.create({ data: {
      workdayDate: date, status: "completed", startedAt, endedAt,
      items: { create: templates[created].map((item, index) => ({
        title: item.title, status: item.completed ? "completed" : "planned",
        completedAt: item.completed ? new Date(startedAt.getTime() + (index + 1) * 60 * 60 * 1000) : null,
        focusSessions: { create: { startedAt: new Date(startedAt.getTime() + index * 2 * 60 * 60 * 1000), endedAt: new Date(startedAt.getTime() + index * 2 * 60 * 60 * 1000 + item.seconds * 1000), durationSeconds: item.seconds } },
      })) },
    } });
    created++;
  }
  console.log(`이전 작업일 예시 ${created}일을 추가했습니다.`);
}

main().finally(() => prisma.$disconnect());
