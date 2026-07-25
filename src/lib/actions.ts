"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "./prisma";
import { generateOccurrences } from "./recurrence";
import { dateKeyToDate, getWorkdayDate, nextDate } from "./workday-date";

const titleSchema = z.string().trim().min(1, "제목을 입력해 주세요.").max(120, "제목은 120자 이하여야 합니다.");
const idSchema = z.string().min(1);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const titleFrom = (form: FormData) => titleSchema.parse(form.get("title"));
const idFrom = (form: FormData, key: string) => idSchema.parse(form.get(key));
const optionalIdFrom = (form: FormData, key: string) => z.string().optional().parse(form.get(key) || undefined);

function refreshWorkspace() {
  ["/", "/inbox", "/upcoming", "/projects", "/library", "/search"].forEach((path) => revalidatePath(path));
}

function estimatedMinutesFrom(form: FormData) {
  const value = form.get("estimatedMinutes");
  if (value === null || value === "") return null;
  return z.coerce.number().int().min(1).max(1440).parse(value);
}

function futureDateKey(days: number) {
  const date = dateKeyToDate(getWorkdayDate());
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

export async function setProjectViewMode(form: FormData) {
  const projectId = idFrom(form, "projectId");
  const viewMode = z.enum(["list", "board"]).parse(form.get("viewMode"));
  await prisma.project.update({ where: { id: projectId, status: "active" }, data: { viewMode } });
  refreshWorkspace();
}

export async function createSection(form: FormData) {
  const projectId = idFrom(form, "projectId");
  const title = titleFrom(form);
  await prisma.$transaction(async (tx) => {
    await tx.project.findFirstOrThrow({ where: { id: projectId, status: "active" } });
    const duplicate = await tx.section.findFirst({ where: { projectId, title: { equals: title, mode: "insensitive" } } });
    if (duplicate) throw new Error("같은 프로젝트에 같은 이름의 섹션이 이미 있습니다.");
    const last = await tx.section.aggregate({ where: { projectId }, _max: { sortOrder: true } });
    await tx.section.create({ data: { projectId, title, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  });
  refreshWorkspace();
}

export async function updateSection(form: FormData) {
  const sectionId = idFrom(form, "sectionId");
  const title = titleFrom(form);
  const section = await prisma.section.findUniqueOrThrow({ where: { id: sectionId } });
  const duplicate = await prisma.section.findFirst({
    where: { projectId: section.projectId, title: { equals: title, mode: "insensitive" }, NOT: { id: sectionId } },
  });
  if (duplicate) throw new Error("같은 프로젝트에 같은 이름의 섹션이 이미 있습니다.");
  await prisma.section.update({ where: { id: sectionId }, data: { title } });
  refreshWorkspace();
}

export async function deleteSection(form: FormData) {
  await prisma.section.delete({ where: { id: idFrom(form, "sectionId") } });
  refreshWorkspace();
}

export async function moveProjectTask(taskIdInput: string, sectionIdInput: string | null, targetIndexInput: number) {
  const taskId = idSchema.parse(taskIdInput);
  const sectionId = z.string().min(1).nullable().parse(sectionIdInput);
  const targetIndex = z.number().int().min(0).parse(targetIndexInput);
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirstOrThrow({ where: { id: taskId, status: "active", parentTaskId: null } });
    if (!task.projectId) throw new Error("프로젝트 작업만 정렬할 수 있습니다.");
    if (sectionId) await tx.section.findFirstOrThrow({ where: { id: sectionId, projectId: task.projectId } });

    const projectTasks = await tx.task.findMany({
      where: { projectId: task.projectId, status: "active", parentTaskId: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, sectionId: true },
    });
    const sourceIds = projectTasks.filter(item => item.sectionId === task.sectionId && item.id !== taskId).map(item => item.id);
    const targetIds = projectTasks.filter(item => item.sectionId === sectionId && item.id !== taskId).map(item => item.id);
    targetIds.splice(Math.min(targetIndex, targetIds.length), 0, taskId);

    if (task.sectionId !== sectionId) {
      await Promise.all(sourceIds.map((id, sortOrder) => tx.task.update({ where: { id }, data: { sortOrder } })));
    }
    await Promise.all(targetIds.map((id, sortOrder) => tx.task.update({
      where: { id },
      data: id === taskId ? { sectionId, sortOrder } : { sortOrder },
    })));
    await tx.task.updateMany({ where: { parentTaskId: taskId }, data: { sectionId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  refreshWorkspace();
}

export async function moveProjectSection(projectIdInput: string, sectionIdInput: string, targetIndexInput: number) {
  const projectId = idSchema.parse(projectIdInput);
  const sectionId = idSchema.parse(sectionIdInput);
  const targetIndex = z.number().int().min(0).parse(targetIndexInput);
  await prisma.$transaction(async (tx) => {
    await tx.section.findFirstOrThrow({ where: { id: sectionId, projectId } });
    const ids = (await tx.section.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    })).map(section => section.id).filter(id => id !== sectionId);
    ids.splice(Math.min(targetIndex, ids.length), 0, sectionId);
    await Promise.all(ids.map((id, sortOrder) => tx.section.update({ where: { id }, data: { sortOrder } })));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  refreshWorkspace();
}

export async function createTask(form: FormData) {
  const title = titleFrom(form), projectId = optionalIdFrom(form, "projectId");
  const estimatedMinutes = estimatedMinutesFrom(form);
  if (projectId) await prisma.project.findFirstOrThrow({ where: { id: projectId, status: "active" } });
  const existing = await prisma.task.findFirst({
    where: { projectId: projectId ?? null, parentTaskId: null, title: { equals: title, mode: "insensitive" } },
  });
  if (existing) {
    if (existing.status === "archived") await prisma.task.update({ where: { id: existing.id }, data: { status: "active", archivedAt: null } });
  } else await prisma.task.create({ data: { projectId, title, estimatedMinutes } });
  refreshWorkspace();
}

export async function createSubtask(form: FormData) {
  const parentTaskId = idFrom(form, "parentTaskId");
  const title = titleFrom(form);
  await prisma.$transaction(async (tx) => {
    const parent = await tx.task.findFirstOrThrow({
      where: { id: parentTaskId, status: "active", parentTaskId: null },
    });
    const duplicate = await tx.task.findFirst({
      where: { parentTaskId, title: { equals: title, mode: "insensitive" } },
    });
    if (duplicate) {
      if (duplicate.status === "archived") {
        await tx.task.update({
          where: { id: duplicate.id },
          data: {
            status: "active",
            archivedAt: null,
            projectId: parent.projectId,
            sectionId: parent.sectionId,
          },
        });
      }
      return;
    }
    const last = await tx.task.aggregate({ where: { parentTaskId, status: "active" }, _max: { sortOrder: true } });
    await tx.task.create({
      data: {
        parentTaskId,
        projectId: parent.projectId,
        sectionId: parent.sectionId,
        title,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
  });
  refreshWorkspace();
}

export async function updateTask(form: FormData) {
  const id = idFrom(form, "taskId"), title = titleFrom(form);
  const task = await prisma.task.findUniqueOrThrow({ where: { id } });
  const duplicate = await prisma.task.findFirst({
    where: { parentTaskId: task.parentTaskId, projectId: task.projectId, title: { equals: title, mode: "insensitive" }, NOT: { id } },
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
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
    await tx.task.update({ where: { id: taskId }, data: { projectId, sectionId: null } });
    if (!task.parentTaskId) await tx.task.updateMany({ where: { parentTaskId: taskId }, data: { projectId, sectionId: null } });
  });
  refreshWorkspace();
}

export async function updateTaskEstimate(form: FormData) {
  await prisma.task.update({
    where: { id: idFrom(form, "taskId"), status: "active" },
    data: { estimatedMinutes: estimatedMinutesFrom(form) },
  });
  refreshWorkspace();
}

export async function archiveTask(form: FormData) {
  const taskId = idFrom(form, "taskId");
  await prisma.$transaction(async (tx) => {
    await tx.workdayItem.deleteMany({
      where: {
        OR: [{ taskId }, { task: { parentTaskId: taskId } }],
        recurrenceRuleId: { not: null },
        status: "planned",
        workday: { workdayDate: { gte: dateKeyToDate(getWorkdayDate()) }, status: { not: "completed" } },
      },
    });
    await tx.task.update({ where: { id: taskId, status: "active" }, data: { status: "archived", archivedAt: new Date() } });
    await tx.task.updateMany({ where: { parentTaskId: taskId, status: "active" }, data: { status: "archived", archivedAt: new Date() } });
  });
  refreshWorkspace();
}

export async function restoreTask(form: FormData) {
  const taskId = idFrom(form, "taskId");
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.update({ where: { id: taskId, status: "archived" }, data: { status: "active", archivedAt: null } });
    if (!task.parentTaskId) await tx.task.updateMany({ where: { parentTaskId: taskId, status: "archived" }, data: { status: "active", archivedAt: null } });
  });
  refreshWorkspace();
}

export async function deleteTask(form: FormData) {
  const taskId = idFrom(form, "taskId");
  await prisma.$transaction(async (tx) => {
    await tx.workdayItem.deleteMany({
      where: {
        taskId,
        recurrenceRuleId: { not: null },
        status: "planned",
        workday: { workdayDate: { gte: dateKeyToDate(getWorkdayDate()) }, status: { not: "completed" } },
      },
    });
    await tx.task.delete({ where: { id: taskId } });
  });
  refreshWorkspace();
}

export async function quickAddTask(form: FormData) {
  const title = titleFrom(form);
  const estimatedMinutes = estimatedMinutesFrom(form);
  const projectId = optionalIdFrom(form, "projectId");
  const destination = z.enum(["inbox", "today", "tomorrow", "date"]).parse(form.get("destination") || "inbox");
  const customDate = destination === "date" ? dateSchema.parse(form.get("date")) : null;
  if (projectId) await prisma.project.findFirstOrThrow({ where: { id: projectId, status: "active" } });
  await prisma.$transaction(async (tx) => {
    let task = await tx.task.findFirst({ where: { projectId: projectId ?? null, parentTaskId: null, title: { equals: title, mode: "insensitive" } } });
    if (task) task = await tx.task.update({ where: { id: task.id }, data: { status: "active", archivedAt: null } });
    else task = await tx.task.create({ data: { title, projectId, estimatedMinutes } });
    if (destination === "inbox") return;
    const today = getWorkdayDate();
    const dateKey = destination === "today" ? today : destination === "tomorrow" ? nextDate(dateKeyToDate(today)).toISOString().slice(0, 10) : customDate!;
    if (dateKey < today) throw new Error("지난 날짜에는 새 작업을 추가할 수 없습니다.");
    const workday = await tx.workday.upsert({ where: { workdayDate: dateKeyToDate(dateKey) }, create: { workdayDate: dateKeyToDate(dateKey) }, update: {} });
    if (workday.status === "completed") throw new Error("종료된 작업일에는 추가할 수 없습니다.");
    await tx.workdayItem.createMany({
      data: [{ workdayId: workday.id, taskId: task.id, titleSnapshot: task.title, legacyTitle: task.title }],
      skipDuplicates: true,
    });
  });
  refreshWorkspace();
  return { success: true };
}

export async function quickAddTaskState(_state: { success: boolean; nonce: number }, form: FormData) {
  await quickAddTask(form);
  return { success: true, nonce: Date.now() };
}

export async function updateRecurrenceRule(form: FormData) {
  const taskId = idFrom(form, "taskId");
  const frequency = z.enum(["daily", "weekly", "monthly"]).parse(form.get("frequency"));
  const interval = z.coerce.number().int().min(1).max(365).parse(form.get("interval") || 1);
  const startsOnKey = dateSchema.parse(form.get("startsOn"));
  const endsOnValue = form.get("endsOn");
  const endsOnKey = endsOnValue ? dateSchema.parse(endsOnValue) : null;
  if (endsOnKey && endsOnKey < startsOnKey) throw new Error("반복 종료일은 시작일보다 빠를 수 없습니다.");
  const weekdays = frequency === "weekly"
    ? z.array(z.coerce.number().int().min(0).max(6)).min(1).parse(form.getAll("weekdays"))
    : [];
  const monthDay = frequency === "monthly"
    ? z.coerce.number().int().min(1).max(31).parse(form.get("monthDay"))
    : null;
  const today = getWorkdayDate();

  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirstOrThrow({ where: { id: taskId, status: "active" }, include: { recurrenceRule: true } });
    if (task.recurrenceRule) {
      await tx.workdayItem.deleteMany({
        where: {
          recurrenceRuleId: task.recurrenceRule.id,
          status: "planned",
          workday: { workdayDate: { gte: dateKeyToDate(today) }, status: { not: "completed" } },
        },
      });
    }
    await tx.recurrenceRule.upsert({
      where: { taskId },
      create: {
        taskId, frequency, interval, weekdays, monthDay,
        startsOn: dateKeyToDate(startsOnKey), endsOn: endsOnKey ? dateKeyToDate(endsOnKey) : null,
      },
      update: {
        frequency, interval, weekdays, monthDay,
        startsOn: dateKeyToDate(startsOnKey), endsOn: endsOnKey ? dateKeyToDate(endsOnKey) : null, generatedUntil: null,
      },
    });
  });
  await generateOccurrences({ from: today, to: futureDateKey(60) });
  refreshWorkspace();
}

export async function deleteRecurrenceRule(form: FormData) {
  const taskId = idFrom(form, "taskId");
  const today = getWorkdayDate();
  await prisma.$transaction(async (tx) => {
    const rule = await tx.recurrenceRule.findUnique({ where: { taskId } });
    if (!rule) return;
    await tx.workdayItem.deleteMany({
      where: {
        recurrenceRuleId: rule.id,
        status: "planned",
        workday: { workdayDate: { gte: dateKeyToDate(today) }, status: { not: "completed" } },
      },
    });
    await tx.recurrenceRule.delete({ where: { id: rule.id } });
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
    await tx.workdayItem.createMany({
      data: [{ workdayId: workday.id, taskId, titleSnapshot: task.title, legacyTitle: task.title }],
      skipDuplicates: true,
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
    let task = await tx.task.findFirst({ where: { projectId: null, parentTaskId: null, title: { equals: item.titleSnapshot, mode: "insensitive" } } });
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
    const completedAt = completed ? null : new Date();
    await tx.workdayItem.update({ where: { id: itemId }, data: { status: completed ? "planned" : "completed", completedAt } });
  });
  refreshWorkspace();
}

export async function reorderWorkdayItem(itemIdInput: string, targetIndexInput: number) {
  const itemId = idSchema.parse(itemIdInput);
  const targetIndex = z.number().int().min(0).parse(targetIndexInput);
  await prisma.$transaction(async (tx) => {
    const item = await tx.workdayItem.findUniqueOrThrow({ where: { id: itemId }, include: { workday: true } });
    if (item.workday.workdayDate.toISOString().slice(0, 10) !== getWorkdayDate()) {
      throw new Error("오늘 작업만 순서를 변경할 수 있습니다.");
    }
    const ids = (await tx.workdayItem.findMany({
      where: { workdayId: item.workdayId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    })).map(value => value.id).filter(id => id !== itemId);
    ids.splice(Math.min(targetIndex, ids.length), 0, itemId);
    await Promise.all(ids.map((id, sortOrder) => tx.workdayItem.update({ where: { id }, data: { sortOrder } })));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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

export async function updateWeeklyFocusGoal(form: FormData) {
  const weeklyFocusMinutes = z.coerce.number().int().min(30).max(10080).parse(form.get("weeklyFocusMinutes"));
  await prisma.productivityGoal.upsert({
    where: { id: "default" },
    create: { weeklyFocusMinutes },
    update: { weeklyFocusMinutes },
  });
  revalidatePath("/growth");
}

export async function carryItem(form: FormData) {
  const item = await prisma.workdayItem.findUniqueOrThrow({ where: { id: idFrom(form, "itemId") }, include: { workday: true } });
  await scheduleItem(item.id, nextDate(item.workday.workdayDate).toISOString().slice(0, 10), "copy");
}

export async function carryAll(form: FormData) {
  const items = await prisma.workdayItem.findMany({ where: { workdayId: idFrom(form, "workdayId"), status: "planned" }, include: { workday: true } });
  for (const item of items) await scheduleItem(item.id, nextDate(item.workday.workdayDate).toISOString().slice(0, 10), "copy");
}
