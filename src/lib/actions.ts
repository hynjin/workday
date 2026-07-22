"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "./prisma";
import { nextDate } from "./workday-date";

const titleSchema = z.string().trim().min(1, "제목을 입력해 주세요.").max(120, "제목은 120자 이하여야 합니다.");
const idSchema = z.string().min(1);
const titleFrom = (form: FormData) => titleSchema.parse(form.get("title"));
const idFrom = (form: FormData, key: string) => idSchema.parse(form.get(key));

export async function createTask(form: FormData) {
  await prisma.task.create({ data: { title: titleFrom(form) } });
  revalidatePath("/");
}
export async function updateTask(form: FormData) {
  await prisma.task.update({ where: { id: idFrom(form, "taskId"), status: "active" }, data: { title: titleFrom(form) } });
  revalidatePath("/");
}
export async function archiveTask(form: FormData) {
  await prisma.task.update({ where: { id: idFrom(form, "taskId"), status: "active" }, data: { status: "archived", archivedAt: new Date() } });
  revalidatePath("/");
}
export async function addWorkdayItem(form: FormData) {
  const workdayId = idFrom(form, "workdayId");
  const taskId = z.string().optional().parse(form.get("taskId") || undefined);
  const title = titleFrom(form);
  await prisma.$transaction(async (tx) => {
    const workday = await tx.workday.findUniqueOrThrow({ where: { id: workdayId } });
    if (workday.status === "completed") throw new Error("종료된 작업일에는 추가할 수 없습니다.");
    if (taskId) await tx.task.findFirstOrThrow({ where: { id: taskId, status: "active" } });
    await tx.workdayItem.create({ data: { workdayId, taskId, title } });
  });
  revalidatePath("/");
}
export async function startWorkday(form: FormData) {
  const id = idFrom(form, "workdayId");
  await prisma.$transaction(async (tx) => {
    const workday = await tx.workday.findUniqueOrThrow({ where: { id }, include: { _count: { select: { items: true } } } });
    if (workday.status !== "planning" || !workday._count.items) throw new Error("할 일을 하나 이상 추가해 주세요.");
    const active = await tx.workday.findFirst({ where: { status: "active", NOT: { id } } });
    if (active) throw new Error("이미 진행 중인 작업일이 있습니다.");
    await tx.workday.update({ where: { id }, data: { status: "active", startedAt: new Date() } });
  });
  redirect("/");
}
export async function toggleItemComplete(form: FormData) {
  const itemId = idFrom(form, "itemId");
  await prisma.$transaction(async (tx) => {
    const item = await tx.workdayItem.findUniqueOrThrow({ where: { id: itemId }, include: { workday: true } });
    if (item.workday.status !== "active") throw new Error("진행 중인 작업일만 변경할 수 있습니다.");
    const completed = item.status === "completed";
    await tx.workdayItem.update({ where: { id: itemId }, data: { status: completed ? "planned" : "completed", completedAt: completed ? null : new Date() } });
  });
  revalidatePath("/");
}
export async function startFocus(form: FormData) {
  const itemId = idFrom(form, "itemId");
  const session = await prisma.$transaction(async (tx) => {
    const item = await tx.workdayItem.findUniqueOrThrow({ where: { id: itemId }, include: { workday: true } });
    if (item.workday.status !== "active") throw new Error("진행 중인 작업일이 아닙니다.");
    const active = await tx.focusSession.findFirst({ where: { endedAt: null } });
    if (active) return active;
    return tx.focusSession.create({ data: { workdayItemId: itemId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  redirect(`/focus/${session.id}`);
}
export async function endFocus(form: FormData) {
  const sessionId = idFrom(form, "sessionId");
  await prisma.$transaction(async (tx) => {
    const session = await tx.focusSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (!session.endedAt) {
      const endedAt = new Date();
      await tx.focusSession.update({ where: { id: sessionId }, data: { endedAt, durationSeconds: Math.max(0, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)) } });
    }
  });
  redirect("/");
}
export async function carryItem(form: FormData) {
  await carry([idFrom(form, "itemId")]);
  revalidatePath("/summary");
}
export async function carryAll(form: FormData) {
  const workdayId = idFrom(form, "workdayId");
  const items = await prisma.workdayItem.findMany({ where: { workdayId, status: "planned" }, select: { id: true } });
  await carry(items.map((item) => item.id));
  revalidatePath("/summary");
}
async function carry(ids: string[]) {
  await prisma.$transaction(async (tx) => {
    for (const id of ids) {
      const source = await tx.workdayItem.findUniqueOrThrow({ where: { id }, include: { workday: true } });
      if (source.status !== "planned" || source.workday.status !== "active") continue;
      const targetDate = nextDate(source.workday.workdayDate);
      const target = await tx.workday.upsert({ where: { workdayDate: targetDate }, create: { workdayDate: targetDate }, update: {} });
      if (target.status === "completed") throw new Error("다음 작업일이 이미 종료되었습니다.");
      await tx.workdayItem.upsert({
        where: { workdayId_carriedFromItemId: { workdayId: target.id, carriedFromItemId: source.id } },
        create: { workdayId: target.id, taskId: source.taskId, title: source.title, carriedFromItemId: source.id }, update: {},
      });
    }
  });
}
export async function endWorkday(form: FormData) {
  const id = idFrom(form, "workdayId");
  await prisma.$transaction(async (tx) => {
    const workday = await tx.workday.findUniqueOrThrow({ where: { id } });
    if (workday.status !== "active") throw new Error("진행 중인 작업일이 아닙니다.");
    const active = await tx.focusSession.findFirst({ where: { endedAt: null, workdayItem: { workdayId: id } } });
    if (active) throw new Error("집중 세션을 먼저 종료해 주세요.");
    await tx.workday.update({ where: { id }, data: { status: "completed", endedAt: new Date() } });
  });
  redirect("/");
}
