import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
async function main() {
  for (const title of ["영어 공부", "AI 공부", "부업 찾기", "인터뷰 준비"]) {
    const exists = await prisma.task.findFirst({ where: { title } });
    if (!exists) await prisma.task.create({ data: { title } });
  }
}
main().finally(() => prisma.$disconnect());
