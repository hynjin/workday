import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
async function main() {
  const project = await prisma.project.upsert({
    where: { id: "seed-learning" },
    create: { id: "seed-learning", title: "배움" },
    update: {},
  });
  for (const title of ["영어 공부", "AI 공부", "부업 찾기", "인터뷰 준비"]) {
    const exists = await prisma.task.findFirst({ where: { projectId: project.id, title } });
    if (!exists) await prisma.task.create({ data: { projectId: project.id, title } });
  }
}
main().finally(() => prisma.$disconnect());
