"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "./prisma";
import { dateKeyToDate, getWorkdayDate, nextDate } from "./workday-date";

const titleSchema = z.string().trim().min(1, "제목을 입력해 주세요.").max(120, "제목은 120자 이하여야 합니다.");
const idSchema = z.string().min(1);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const titleFrom = (form: FormData) => titleSchema.parse(form.get("title"));
const idFrom = (form: FormData, key: string) => idSchema.parse(form.get(key));
const optionalIdFrom = (form: FormData, key: string) => z.string().optional().parse(form.get(key) || undefined);

function refreshWorkspace() {
  ["/", "/inbox", "/upcoming", "/projects", "/library"].forEach((path) => revalidatePath(path));
}

export async function createProject(form: FormData) {
  const title = titleFrom(form);
  const existing = await prisma.project.findFirst({ where: { title: { equals: title, mode: "insensitive" } } });
  const project = existing
    ? await prisma.project.update({ where: { id: existing.id }, data: { status: "active", archivedAt: null } })
    : await prisma.project.create({ data: { title } });
  refreshWorkspace();
  redirect(`/projects?project=${project.id}`);
}

export async function updateProject(form: FormData) {
  const id = idFrom(form, "projectId"), title = titleFrom(form);
  const duplicate = await prisma.project.findFirst({ where: { title: { equals: title, mode: "insensitive" }, NOT: { id } } });
  if (duplicate) throw new Error("같은 이름의 프로젝트가 이미 있습니다.");
  await prisma.project.update({ where: { id }, data: { title } });
  refreshWorkspace();
}

export async function archiveProject(form: FormData) {
  await prisma.project.update({ where: { id: idFrom(form, "projectId") }, data: { status: "archived", archivedAt: new Date() } });
  refreshWorkspace();
}

export async function restoreProject(form: FormData) {
  await prisma.project.update({ where: { id: idFrom(form, "projectId") }, data: { status: "active", archivedAt: null } });
  refreshWorkspace();
}

export async function deleteProject(form: FormData) {
  await prisma.project.delete({ where: { id: idFrom(form, "projectId") } });
  refreshWorkspace();
  redirect("/projects");
}

export async function createTask(form: FormData) {
  const title = titleFrom(form), projectId = optionalIdFrom(form, "projectId");
  if (projectId) await prisma.project.findFirstOrThrow({ where: { id: projectId, status: "active" } });
  const existing = await prisma.task.findFirst({
    where: { projectId: projectId ?? null, title: { equals: title, mode: "insensitive" } },
  });
  if (existing) {
    if (existing.status === "archived") await prisma.task.update({ where: { id: existing.id }, data: { status: "active", archivedAt: null } });
  } else await prisma.task.create({ data: { projectId, title } });
  refreshWorkspace();
}

export async function updateTask(form: FormData) {
  const id = idFrom(form, "taskId"), title = titleFrom(form);
  const task = await prisma.task.findUniqueOrThrow({ where: { id } });
  const duplicate = await prisma.task.findFirst({
    where: { projectId: task.projectId, title: { equals: title, mode: "insensitive" }, NOT: { id } },
  });
  if (duplicate) throw new Error("같은 목록에 같은 이름의 작업이 이미 있습니다.");
  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id, status: "active" }, data: { title } });
    await tx.workdayItem.updateMany({
      where: { taskId: id, workday: { status: { in: ["planning", "active"] } } },
      data: { titleSnapshot: title, legacyTitle: title },
    });
  });
  refreshWorkspace();
}

export async function moveTaskToProject(form: FormData) {
  const taskId = idFrom(form, "taskId"), projectId = optionalIdFrom(form, "projectId");
  if (projectId) await prisma.project.findFirstOrThrow({ where: { id: projectId, status: "active" } });
  await prisma.task.update({ where: { id: taskId }, data: { projectId, sectionId: null } });
  refreshWorkspace();
}

export async function archiveTask(form: FormData) {
  await prisma.task.update({ where: { id: idFrom(form, "taskId"), status: "active" }, data: { status: "archived", archivedAt: new Date() } });
  refreshWorkspace();
}

export async function restoreTask(form: FormData) {
  await prisma.task.update({ where: { id: idFrom(form, "taskId"), status: "archived" }, data: { status: "active", archivedAt: null } });
  refreshWorkspace();
}

export async function deleteTask(form: FormData) {
  await prisma.task.delete({ where: { id: idFrom(form, "taskId") } });
  refreshWorkspace();
}

export async function quickAddTask(form: FormData) {
  const title = titleFrom(form);
  const projectId = optionalIdFrom(form, "projectId");
  const destination = z.enum(["inbox", "today", "tomorrow", "date"]).parse(form.get("destination") || "inbox");
  const customDate = destination === "date" ? dateSchema.parse(form.get("date")) : null;
  if (projectId) await prisma.project.findFirstOrThrow({ where: { id: projectId, status: "active" } });
  await prisma.$transaction(async (tx) => {
    let task = await tx.task.findFirst({ where: { projectId: projectId ?? null, title: { equals: title, mode: "insensitive" } } });
    if (task) task = await tx.task.update({ where: { id: task.id }, data: { status: "active", archivedAt: null } });
    else task = await tx.task.create({ data: { title, projectId } });
    if (destination === "inbox") return;
    const today = getWorkdayDate();
    const dateKey = destination === "today" ? today : destination === "tomorrow" ? nextDate(dateKeyToDate(today)).toISOString().slice(0, 10) : customDate!;
    if (dateKey < today) throw new Error("지난 날짜에는 새 작업을 추가할 수 없습니다.");
    const workday = await tx.workday.upsert({ where: { workdayDate: dateKeyToDate(dateKey) }, create: { workdayDate: dateKeyToDate(dateKey) }, update: {} });
    if (workday.status === "completed") throw new Error("종료된 작업일에는 추가할 수 없습니다.");
    await tx.workdayItem.upsert({
      where: { workdayId_taskId: { workdayId: workday.id, taskId: task.id } },
      create: { workdayId: workday.id, taskId: task.id, titleSnapshot: task.title, legacyTitle: task.title },
      update: {},
    });
  });
  refreshWorkspace();
}

export async function scheduleTaskForDate(form: FormData) {
  const taskId = idFrom(form, "taskId"), dateKey = dateSchema.parse(form.get("date"));
  const today = getWorkdayDate();
  if (dateKey < today) throw new Error("지난 날짜에는 계획할 수 없습니다.");
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirstOrThrow({ where: { id: taskId, status: "active" } });
    const workday = await tx.workday.upsert({ where: { workdayDate: dateKeyToDate(dateKey) }, create: { workdayDate: dateKeyToDate(dateKey) }, update: {} });
    if (workday.status === "completed") throw new Error("종료된 작업일에는 추가할 수 없습니다.");
    await tx.workdayItem.upsert({
      where: { workdayId_taskId: { workdayId: workday.id, taskId } },
      create: { workdayId: workday.id, taskId, titleSnapshot: task.title, legacyTitle: task.title },
      update: {},
    });
  });
  refreshWorkspace();
}

export async function addWorkdayItem(form: FormData) {
  const workdayId = idFrom(form, "workdayId");
  const taskId = optionalIdFrom(form, "taskId");
  const suppliedTitle = taskId ? null : titleFrom(form);
  await prisma.$transaction(async (tx) => {
    const workday = await tx.workday.findUniqueOrThrow({ where: { id: workdayId } });
    if (workday.status === "completed") throw new Error("종료된 작업일에는 추가할 수 없습니다.");
    const task = taskId ? await tx.task.findFirstOrThrow({ where: { id: taskId, status: "active" } }) : null;
    const title = task?.title ?? suppliedTitle!;
    const existing = taskId
      ? await tx.workdayItem.findFirst({ where: { workdayId, taskId } })
      : await tx.workdayItem.findFirst({ where: { workdayId, taskId: null, titleSnapshot: { equals: title, mode: "insensitive" } } });
    if (!existing) await tx.workdayItem.create({ data: { workdayId, taskId, titleSnapshot: title, legacyTitle: title } });
  });
  refreshWorkspace();
}

export async function removeWorkdayItem(form: FormData) {
  const id = idFrom(form, "itemId");
  await prisma.$transaction(async (tx) => {
    const item = await tx.workdayItem.findUniqueOrThrow({ where: { id }, include: { workday: true } });
    if (item.workday.status === "completed") throw new Error("지난 작업일의 기록은 삭제할 수 없습니다.");
    if (await tx.focusSession.findFirst({ where: { workdayItemId: id, endedAt: null } })) throw new Error("집중 중인 작업은 세션 종료 후 삭제할 수 있습니다.");
    await tx.workdayItem.delete({ where: { id } });
  });
  refreshWorkspace();
}

export async function saveWorkdayItemToLibrary(form: FormData) {
  const itemId = idFrom(form, "itemId");
  await prisma.$transaction(async (tx) => {
    const item = await tx.workdayItem.findUniqueOrThrow({ where: { id: itemId } });
    if (item.taskId) return;
    let task = await tx.task.findFirst({ where: { projectId: null, title: { equals: item.titleSnapshot, mode: "insensitive" } } });
    if (task) task = await tx.task.update({ where: { id: task.id }, data: { status: "active", archivedAt: null } });
    else task = await tx.task.create({ data: { projectId: null, title: item.titleSnapshot } });
    const duplicate = await tx.workdayItem.findFirst({ where: { workdayId: item.workdayId, taskId: task.id, NOT: { id: item.id } } });
    if (!duplicate) await tx.workdayItem.update({ where: { id: item.id }, data: { taskId: task.id } });
  });
  refreshWorkspace();
}

async function scheduleItem(itemId: string, dateKey: string, mode: "move" | "copy") {
  const today = getWorkdayDate();
  if (dateKey < today) throw new Error("지난 날짜로 이동하거나 복사할 수 없습니다.");
  await prisma.$transaction(async (tx) => {
    const source = await tx.workdayItem.findUniqueOrThrow({ where: { id: itemId }, include: { workday: true } });
    if (source.workday.status === "completed") throw new Error("지난 작업일 기록은 변경할 수 없습니다.");
    if (await tx.focusSession.findFirst({ where: { workdayItemId: itemId, endedAt: null } })) throw new Error("집중 중인 작업은 이동할 수 없습니다.");
    const target = await tx.workday.upsert({ where: { workdayDate: dateKeyToDate(dateKey) }, create: { workdayDate: dateKeyToDate(dateKey) }, update: {} });
    if (target.status === "completed") throw new Error("종료된 작업일로 이동할 수 없습니다.");
    const duplicate = source.taskId
      ? await tx.workdayItem.findFirst({ where: { workdayId: target.id, taskId: source.taskId } })
      : await tx.workdayItem.findFirst({ where: { workdayId: target.id, taskId: null, titleSnapshot: { equals: source.titleSnapshot, mode: "insensitive" } } });
    if (!duplicate) {
      await tx.workdayItem.create({
        data: {
          workdayId: target.id, taskId: source.taskId, titleSnapshot: source.titleSnapshot, legacyTitle: source.legacyTitle,
          carriedFromItemId: mode === "copy" ? source.id : source.carriedFromItemId, isKeyTask: source.isKeyTask, sortOrder: source.sortOrder,
        },
      });
    }
    if (mode === "move" && target.id !== source.workdayId) await tx.workdayItem.delete({ where: { id: source.id } });
  });
  refreshWorkspace();
}

export async function moveWorkdayItem(form: FormData) {
  await scheduleItem(idFrom(form, "itemId"), dateSchema.parse(form.get("date")), "move");
}

export async function copyWorkdayItem(form: FormData) {
  await scheduleItem(idFrom(form, "itemId"), dateSchema.parse(form.get("date")), "copy");
}

export async function startWorkday(form: FormData) {
  const id = idFrom(form, "workdayId");
  await prisma.$transaction(async (tx) => {
    const workday = await tx.workday.findUniqueOrThrow({ where: { id }, include: { _count: { select: { items: true } } } });
    if (workday.status !== "planning" || !workday._count.items) throw new Error("할 일을 하나 이상 추가해 주세요.");
    if (await tx.workday.findFirst({ where: { status: "active", NOT: { id } } })) throw new Error("이미 진행 중인 작업일이 있습니다.");
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
  refreshWorkspace();
}

export async function startFocus(form: FormData) {
  const itemId = idFrom(form, "itemId");
  const session = await prisma.$transaction(async (tx) => {
    const item = await tx.workdayItem.findUniqueOrThrow({ where: { id: itemId }, include: { workday: true } });
    if (item.workday.status !== "active") throw new Error("진행 중인 작업일이 아닙니다.");
    if (item.status === "completed") throw new Error("완료 취소 후 집중을 시작해 주세요.");
    const active = await tx.focusSession.findFirst({ where: { endedAt: null } });
    return active ?? tx.focusSession.create({ data: { workdayItemId: itemId } });
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
  const item = await prisma.workdayItem.findUniqueOrThrow({ where: { id: idFrom(form, "itemId") }, include: { workday: true } });
  await scheduleItem(item.id, nextDate(item.workday.workdayDate).toISOString().slice(0, 10), "copy");
}

export async function carryAll(form: FormData) {
  const items = await prisma.workdayItem.findMany({ where: { workdayId: idFrom(form, "workdayId"), status: "planned" }, include: { workday: true } });
  for (const item of items) await scheduleItem(item.id, nextDate(item.workday.workdayDate).toISOString().slice(0, 10), "copy");
}
