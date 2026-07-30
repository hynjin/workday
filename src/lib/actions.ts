"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "./prisma";
import { generateOccurrences } from "./recurrence";
import { dateKeyToDate, getWorkdayDate, nextDate, WORKDAY_TIME_ZONE } from "./workday-date";
import { ownedWorkdayWhere } from "./auth";

const titleSchema = z.string().trim().min(1, "제목을 입력해 주세요.").max(120, "제목은 120자 이하여야 합니다.");
const idSchema = z.string().min(1);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const titleFrom = (form: FormData) => titleSchema.parse(form.get("title"));
const idFrom = (form: FormData, key: string) => idSchema.parse(form.get(key));
const optionalIdFrom = (form: FormData, key: string) => z.string().optional().parse(form.get(key) || undefined);
const colorFrom = (form: FormData) => z.enum(["sky", "mint", "lilac", "peach", "butter", "gray"]).parse(form.get("color") || "sky");
const priorityFrom = (form: FormData) => z.enum(["low", "normal", "high"]).parse(form.get("priority") || "normal");

function refreshWorkspace() {
  ["/", "/tasks", "/inbox", "/upcoming", "/areas", "/projects", "/growth", "/archive", "/library", "/search"].forEach((path) => revalidatePath(path));
}

function estimatedMinutesFrom(form: FormData) {
  const value = form.get("estimatedMinutes");
  if (value === null || value === "") return null;
  return z.coerce.number().int().min(1).max(1440).parse(value);
}

function scheduleDatesFrom(form: FormData, fallback: string[] = []) {
  const raw = form.get("dates");
  if (!raw) return fallback;
  const parsed = z.array(dateSchema).max(62).parse(JSON.parse(String(raw)));
  return [...new Set(parsed)].sort();
}

function futureDateKey(days: number) {
  const date = dateKeyToDate(getWorkdayDate());
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function createProject(form: FormData) {
  const title = titleFrom(form);
  const areaId = optionalIdFrom(form, "areaId");
  const color = colorFrom(form);
  if (areaId) await prisma.area.findFirstOrThrow({ where: { id: areaId, status: "active" } });
  const existing = await prisma.project.findFirst({ where: { areaId: areaId ?? null, title: { equals: title, mode: "insensitive" } } });
  const project = existing
    ? await prisma.project.update({ where: { id: existing.id }, data: { status: "active", areaId, color, archivedAt: null, completedAt: null } })
    : await prisma.project.create({ data: { title, areaId, color } });
  refreshWorkspace();
  redirect(`/projects?project=${project.id}`);
}

export async function createArea(form: FormData) {
  const title = titleFrom(form);
  const color = colorFrom(form);
  const existing = await prisma.area.findFirst({ where: { title: { equals: title, mode: "insensitive" } } });
  const area = existing
    ? await prisma.area.update({ where: { id: existing.id }, data: { status: "active", color, archivedAt: null } })
    : await prisma.area.create({ data: { title, color } });
  refreshWorkspace();
  redirect(`/areas?area=${area.id}`);
}

export async function updateArea(form: FormData) {
  const id = idFrom(form, "areaId");
  const title = titleFrom(form);
  const duplicate = await prisma.area.findFirst({ where: { title: { equals: title, mode: "insensitive" }, NOT: { id } } });
  if (duplicate) throw new Error("같은 이름의 Area가 이미 있습니다.");
  const color = form.has("color") ? colorFrom(form) : undefined;
  await prisma.area.update({ where: { id }, data: { title, color } });
  refreshWorkspace();
}

export async function archiveArea(form: FormData) {
  await prisma.area.update({ where: { id: idFrom(form, "areaId") }, data: { status: "archived", archivedAt: new Date() } });
  refreshWorkspace();
}

export async function restoreArea(form: FormData) {
  await prisma.area.update({ where: { id: idFrom(form, "areaId") }, data: { status: "active", archivedAt: null } });
  refreshWorkspace();
}

export async function deleteArea(form: FormData) {
  await prisma.area.delete({ where: { id: idFrom(form, "areaId") } });
  refreshWorkspace();
}

export async function updateProject(form: FormData) {
  const id = idFrom(form, "projectId"), title = titleFrom(form);
  const duplicate = await prisma.project.findFirst({ where: { title: { equals: title, mode: "insensitive" }, NOT: { id } } });
  if (duplicate) throw new Error("같은 이름의 프로젝트가 이미 있습니다.");
  const color = form.has("color") ? colorFrom(form) : undefined;
  await prisma.project.update({ where: { id }, data: { title, color } });
  refreshWorkspace();
}

export async function updateProjectArea(form: FormData) {
  const projectId = idFrom(form, "projectId");
  const areaId = optionalIdFrom(form, "areaId");
  if (areaId) await prisma.area.findFirstOrThrow({ where: { id: areaId, status: "active" } });
  await prisma.project.update({ where: { id: projectId }, data: { areaId: areaId ?? null } });
  refreshWorkspace();
}

export async function createAreaForProject(form: FormData) {
  const projectId = idFrom(form, "projectId");
  const title = titleFrom(form);
  const existing = await prisma.area.findFirst({ where: { title: { equals: title, mode: "insensitive" } } });
  const area = existing
    ? await prisma.area.update({ where: { id: existing.id }, data: { status: "active", archivedAt: null } })
    : await prisma.area.create({ data: { title } });
  await prisma.project.update({ where: { id: projectId }, data: { areaId: area.id } });
  refreshWorkspace();
}

export async function archiveProject(form: FormData) {
  await prisma.project.update({ where: { id: idFrom(form, "projectId") }, data: { status: "archived", archivedAt: new Date() } });
  refreshWorkspace();
}

export async function restoreProject(form: FormData) {
  const id = idFrom(form, "projectId");
  const project = await prisma.project.findUniqueOrThrow({ where: { id } });
  await prisma.project.update({
    where: { id },
    data: { status: project.completedAt ? "completed" : "active", archivedAt: null },
  });
  refreshWorkspace();
}

export async function completeProject(form: FormData) {
  await prisma.project.update({
    where: { id: idFrom(form, "projectId"), status: "active" },
    data: { status: "completed", completedAt: new Date(), archivedAt: null },
  });
  refreshWorkspace();
}

export async function reopenProject(form: FormData) {
  await prisma.project.update({
    where: { id: idFrom(form, "projectId"), status: "completed" },
    data: { status: "active", completedAt: null },
  });
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
  const title = titleFrom(form), projectId = optionalIdFrom(form, "projectId"), areaId = optionalIdFrom(form, "areaId");
  if (projectId && areaId) throw new Error("작업은 Area와 Project 중 한 곳에만 직접 소속될 수 있습니다.");
  const estimatedMinutes = estimatedMinutesFrom(form);
  const priority = priorityFrom(form);
  if (projectId) await prisma.project.findFirstOrThrow({ where: { id: projectId, status: "active" } });
  if (areaId) await prisma.area.findFirstOrThrow({ where: { id: areaId, status: "active" } });
  const existing = await prisma.task.findFirst({
    where: { projectId: projectId ?? null, areaId: areaId ?? null, parentTaskId: null, title: { equals: title, mode: "insensitive" } },
  });
  if (existing) {
    await prisma.task.update({ where: { id: existing.id }, data: { status: "active", priority, estimatedMinutes, archivedAt: null } });
  } else await prisma.task.create({ data: { projectId, areaId, title, estimatedMinutes, priority } });
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
            areaId: parent.areaId,
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
        areaId: parent.areaId,
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
    where: { parentTaskId: task.parentTaskId, projectId: task.projectId, areaId: task.areaId, title: { equals: title, mode: "insensitive" }, NOT: { id } },
  });
  if (duplicate) throw new Error("같은 목록에 같은 이름의 작업이 이미 있습니다.");
  await prisma.$transaction(async (tx) => {
    const priority = form.has("priority") ? priorityFrom(form) : undefined;
    const estimatedMinutes = form.has("estimatedMinutes") ? estimatedMinutesFrom(form) : undefined;
    await tx.task.update({ where: { id, status: "active" }, data: { title, priority, estimatedMinutes } });
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
    await tx.task.update({ where: { id: taskId }, data: { projectId, areaId: null, sectionId: null } });
    if (!task.parentTaskId) await tx.task.updateMany({ where: { parentTaskId: taskId }, data: { projectId, areaId: null, sectionId: null } });
  });
  refreshWorkspace();
}

export async function moveTaskToInbox(form: FormData) {
  const taskId = idFrom(form, "taskId");
  const returnProjectId = idFrom(form, "returnProjectId");
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirstOrThrow({
      where: { id: taskId, projectId: returnProjectId, parentTaskId: null, status: "active" },
    });
    await tx.task.update({
      where: { id: task.id },
      data: { projectId: null, areaId: null, sectionId: null },
    });
    await tx.task.updateMany({
      where: { parentTaskId: task.id },
      data: { projectId: null, areaId: null, sectionId: null },
    });
    const verified = await tx.task.findUniqueOrThrow({ where: { id: task.id } });
    if (verified.projectId || verified.areaId || verified.sectionId) throw new Error("Inbox 이동을 확인하지 못했습니다.");
  });
  refreshWorkspace();
  redirect(`/projects?project=${encodeURIComponent(returnProjectId)}&moved=${encodeURIComponent(taskId)}&fromProject=${encodeURIComponent(returnProjectId)}`);
}

export async function undoMoveTaskToInbox(form: FormData) {
  const taskId = idFrom(form, "taskId");
  const projectId = idFrom(form, "projectId");
  await prisma.$transaction(async (tx) => {
    await tx.project.findFirstOrThrow({ where: { id: projectId, status: "active" } });
    const task = await tx.task.findFirstOrThrow({
      where: { id: taskId, projectId: null, areaId: null, parentTaskId: null, status: "active" },
    });
    await tx.task.update({ where: { id: task.id }, data: { projectId } });
    await tx.task.updateMany({ where: { parentTaskId: task.id }, data: { projectId } });
  });
  refreshWorkspace();
  redirect(`/projects?project=${encodeURIComponent(projectId)}`);
}

export async function moveTaskToArea(form: FormData) {
  const taskId = idFrom(form, "taskId"), areaId = optionalIdFrom(form, "areaId");
  if (areaId) await prisma.area.findFirstOrThrow({ where: { id: areaId, status: "active" } });
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
    await tx.task.update({ where: { id: taskId }, data: { areaId, projectId: null, sectionId: null } });
    if (!task.parentTaskId) await tx.task.updateMany({ where: { parentTaskId: taskId }, data: { areaId, projectId: null, sectionId: null } });
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
  const areaId = optionalIdFrom(form, "areaId");
  const priority = priorityFrom(form);
  const repeat = z.enum(["none", "daily", "weekly", "monthly"]).parse(form.get("repeat") || "none");
  if (projectId && areaId) throw new Error("작업 위치는 한 곳만 선택할 수 있습니다.");
  const destination = z.enum(["inbox", "today", "tomorrow", "date"]).parse(form.get("destination") || "inbox");
  const customDate = destination === "date" ? dateSchema.parse(form.get("date")) : null;
  const today = getWorkdayDate();
  const fallbackDates = destination === "inbox"
    ? []
    : [destination === "today" ? today : destination === "tomorrow" ? futureDateKey(1) : customDate!];
  const scheduleDates = scheduleDatesFrom(form, fallbackDates);
  if (repeat !== "none" && scheduleDates.length !== 1) throw new Error("반복 작업은 시작일 한 개가 필요합니다.");
  if (projectId) await prisma.project.findFirstOrThrow({ where: { id: projectId, status: "active" } });
  if (areaId) await prisma.area.findFirstOrThrow({ where: { id: areaId, status: "active" } });
  await prisma.$transaction(async (tx) => {
    let task = await tx.task.findFirst({ where: { projectId: projectId ?? null, areaId: areaId ?? null, parentTaskId: null, title: { equals: title, mode: "insensitive" } } });
    if (task) task = await tx.task.update({ where: { id: task.id }, data: { status: "active", priority, estimatedMinutes, archivedAt: null } });
    else task = await tx.task.create({ data: { title, projectId, areaId, estimatedMinutes, priority } });
    for (const dateKey of scheduleDates) {
      const workdayDate = dateKeyToDate(dateKey);
      const workday = await tx.workday.upsert({ where: await ownedWorkdayWhere(workdayDate), create: { workdayDate }, update: {} });
      await tx.workdayItem.createMany({
        data: [{ workdayId: workday.id, taskId: task.id, titleSnapshot: task.title, legacyTitle: task.title, dailyGoalMinutes: estimatedMinutes }],
        skipDuplicates: true,
      });
    }
    if (repeat !== "none") {
      const start = scheduleDates[0];
      const startDate = dateKeyToDate(start);
      await tx.recurrenceRule.upsert({
        where: { taskId: task.id },
        create: {
          taskId: task.id,
          frequency: repeat,
          interval: 1,
          weekdays: repeat === "weekly" ? [startDate.getUTCDay()] : [],
          monthDay: repeat === "monthly" ? startDate.getUTCDate() : null,
          startsOn: startDate,
        },
        update: {
          frequency: repeat,
          interval: 1,
          weekdays: repeat === "weekly" ? [startDate.getUTCDay()] : [],
          monthDay: repeat === "monthly" ? startDate.getUTCDate() : null,
          startsOn: startDate,
          endsOn: null,
          generatedUntil: null,
        },
      });
    }
  });
  if (repeat !== "none") await generateOccurrences({ from: scheduleDates[0], to: futureDateKey(60) });
  refreshWorkspace();
  return { success: true };
}

export async function syncTaskSchedule(form: FormData) {
  const taskId = idFrom(form, "taskId");
  const dates = scheduleDatesFrom(form);
  const task = await prisma.task.findFirstOrThrow({
    where: { id: taskId, status: "active" },
    select: { id: true, title: true, estimatedMinutes: true },
  });
  const desired = new Set(dates);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.workdayItem.findMany({
      where: { taskId },
      select: {
        id: true,
        status: true,
        dismissedAt: true,
        workday: { select: { workdayDate: true } },
        focusSessions: { select: { id: true }, take: 1 },
      },
    });
    const removable = existing
      .filter(item => item.status === "planned" && !item.focusSessions.length && !desired.has(item.workday.workdayDate.toISOString().slice(0, 10)))
      .map(item => item.id);
    if (removable.length) await tx.workdayItem.deleteMany({ where: { id: { in: removable } } });
    const existingByDate = new Map(existing.map(item => [item.workday.workdayDate.toISOString().slice(0, 10),item]));
    for (const key of dates) {
      const scheduled = existingByDate.get(key);
      if (scheduled) {
        if (scheduled.dismissedAt) await tx.workdayItem.update({ where:{ id:scheduled.id }, data:{ dismissedAt:null } });
        continue;
      }
      const workdayDate = dateKeyToDate(key);
      const workday = await tx.workday.upsert({ where: await ownedWorkdayWhere(workdayDate), create: { workdayDate }, update: {} });
      await tx.workdayItem.create({
        data: {
          workdayId: workday.id,
          taskId: task.id,
          titleSnapshot: task.title,
          legacyTitle: task.title,
          dailyGoalMinutes: task.estimatedMinutes,
        },
      });
    }
  });
  refreshWorkspace();
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
  const scheduledItemId = optionalIdFrom(form, "scheduledItemId");
  const today = getWorkdayDate();
  if (dateKey < today) throw new Error("지난 날짜에는 계획할 수 없습니다.");
  if (scheduledItemId) {
    const scheduledItem = await prisma.workdayItem.findFirstOrThrow({
      where: {
        id: scheduledItemId,
        taskId,
        status: "planned",
        recurrenceRuleId: null,
        workday: { status: { not: "completed" } },
      },
    });
    await scheduleItem(scheduledItem.id, dateKey, "move");
    return;
  }
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirstOrThrow({ where: { id: taskId, status: "active" } });
    const workdayDate = dateKeyToDate(dateKey);
    const workday = await tx.workday.upsert({ where: await ownedWorkdayWhere(workdayDate), create: { workdayDate }, update: {} });
    if (workday.status === "completed") throw new Error("종료된 작업일에는 추가할 수 없습니다.");
    await tx.workdayItem.createMany({
      data: [{ workdayId: workday.id, taskId, titleSnapshot: task.title, legacyTitle: task.title }],
      skipDuplicates: true,
    });
  });
  refreshWorkspace();
}

export async function unscheduleTask(form: FormData) {
  const taskId = idFrom(form, "taskId");
  const itemId = idFrom(form, "scheduledItemId");
  await prisma.$transaction(async (tx) => {
    const item = await tx.workdayItem.findFirstOrThrow({
      where: {
        id: itemId,
        taskId,
        status: "planned",
        recurrenceRuleId: null,
        workday: { status: { not: "completed" } },
      },
    });
    if (await tx.focusSession.findFirst({ where: { workdayItemId: item.id, endedAt: null } })) {
      throw new Error("집중 중인 작업은 일정 해제할 수 없습니다.");
    }
    await tx.workdayItem.delete({ where: { id: item.id } });
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
    if (existing) await tx.workdayItem.update({ where: { id: existing.id }, data: { dismissedAt: null } });
    else await tx.workdayItem.create({ data: { workdayId, taskId, titleSnapshot: title, legacyTitle: title } });
  });
  refreshWorkspace();
}

export async function createTodayTask(form: FormData) {
  const title = titleFrom(form);
  const dailyGoalMinutes = estimatedMinutesFrom(form);
  const workdayId = idFrom(form, "workdayId");
  await prisma.$transaction(async (tx) => {
    const workday = await tx.workday.findUniqueOrThrow({ where: { id: workdayId } });
    if (workday.workdayDate.toISOString().slice(0, 10) !== getWorkdayDate()) throw new Error("오늘 작업일에만 바로 추가할 수 있습니다.");
    let task = await tx.task.findFirst({
      where: { projectId: null, areaId: null, parentTaskId: null, title: { equals: title, mode: "insensitive" } },
    });
    if (!task) task = await tx.task.create({ data: { title } });
    const existing = await tx.workdayItem.findFirst({ where: { workdayId, taskId: task.id } });
    if (existing) {
      await tx.workdayItem.update({ where: { id: existing.id }, data: { dismissedAt: null, dailyGoalMinutes } });
    } else {
      await tx.workdayItem.create({ data: { workdayId, taskId: task.id, titleSnapshot: task.title, legacyTitle: task.title, dailyGoalMinutes } });
    }
  });
  refreshWorkspace();
}

export async function updateDailyGoal(form: FormData) {
  const itemId = idFrom(form, "itemId");
  const dailyGoalMinutes = estimatedMinutesFrom(form);
  await prisma.workdayItem.update({ where: { id: itemId }, data: { dailyGoalMinutes } });
  refreshWorkspace();
}

export async function removeWorkdayItem(form: FormData) {
  const id = idFrom(form, "itemId");
  const dateKey = await prisma.$transaction(async (tx) => {
    const item = await tx.workdayItem.findUniqueOrThrow({ where: { id }, include: { workday: true } });
    if (item.workday.status === "completed") throw new Error("지난 작업일의 기록은 삭제할 수 없습니다.");
    const sessions = await tx.focusSession.findMany({ where: { workdayItemId: id }, select: { endedAt: true, durationSeconds: true } });
    if (sessions.some(session => !session.endedAt)) throw new Error("집중 중인 작업은 세션 종료 후 오늘에서 뺄 수 있습니다.");
    await tx.workdayItem.update({ where: { id }, data: { dismissedAt: new Date() } });
    return item.workday.workdayDate.toISOString().slice(0, 10);
  });
  refreshWorkspace();
  const dateParam = dateKey === getWorkdayDate() ? "" : `date=${encodeURIComponent(dateKey)}&`;
  redirect(`/?${dateParam}removed=${encodeURIComponent(id)}`);
}

export async function undoRemoveWorkdayItem(form: FormData) {
  const itemId = idFrom(form, "itemId");
  const item = await prisma.workdayItem.update({
    where: { id: itemId, dismissedAt: { not: null } },
    data: { dismissedAt: null },
    include: { workday: { select: { workdayDate: true } } },
  });
  refreshWorkspace();
  const dateKey = item.workday.workdayDate.toISOString().slice(0, 10);
  redirect(dateKey === getWorkdayDate() ? "/" : `/?date=${encodeURIComponent(dateKey)}`);
}

export async function deleteTaskFromToday(form: FormData) {
  const itemId = idFrom(form, "itemId");
  await prisma.$transaction(async (tx) => {
    const item = await tx.workdayItem.findUniqueOrThrow({
      where: { id: itemId },
      include: { focusSessions: true },
    });
    if (!item.taskId) {
      if (item.status === "completed" || item.focusSessions.some(session => (session.durationSeconds ?? 0) > 0)) {
        await tx.workdayItem.update({ where: { id: itemId }, data: { dismissedAt: new Date() } });
      } else await tx.workdayItem.delete({ where: { id: itemId } });
      return;
    }
    const hasHistory = await tx.workdayItem.findFirst({
      where: {
        taskId: item.taskId,
        OR: [{ status: "completed" }, { focusSessions: { some: { durationSeconds: { gt: 0 } } } }],
      },
      select: { id: true },
    });
    if (hasHistory) {
      await tx.task.update({ where: { id: item.taskId }, data: { status: "archived", archivedAt: new Date() } });
      await tx.workdayItem.update({ where: { id: itemId }, data: { dismissedAt: new Date() } });
    } else {
      await tx.workdayItem.delete({ where: { id: itemId } });
      await tx.task.delete({ where: { id: item.taskId } });
    }
  });
  refreshWorkspace();
}

export async function saveWorkdayItemToLibrary(form: FormData) {
  const itemId = idFrom(form, "itemId");
  await prisma.$transaction(async (tx) => {
    const item = await tx.workdayItem.findUniqueOrThrow({ where: { id: itemId } });
    if (item.taskId) return;
    let task = await tx.task.findFirst({ where: { projectId: null, areaId: null, parentTaskId: null, title: { equals: item.titleSnapshot, mode: "insensitive" } } });
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
    const workdayDate = dateKeyToDate(dateKey);
    const target = await tx.workday.upsert({ where: await ownedWorkdayWhere(workdayDate), create: { workdayDate }, update: {} });
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
    const itemDate = item.workday.workdayDate.toISOString().slice(0, 10);
    if (itemDate !== getWorkdayDate() || item.workday.status === "completed") {
      throw new Error("오늘 작업만 완료 상태를 변경할 수 있습니다.");
    }
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
    if (item.workday.status === "completed") throw new Error("완료된 작업일은 순서를 변경할 수 없습니다.");
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
    const item = await tx.workdayItem.findUniqueOrThrow({
      where: { id: itemId },
      include: { workday: true, task: { include: { project: { include: { area: true } }, area: true } } },
    });
    const itemDate = item.workday.workdayDate.toISOString().slice(0, 10);
    if (itemDate !== getWorkdayDate() || item.workday.status === "completed") {
      throw new Error("오늘 작업에서만 집중을 시작할 수 있습니다.");
    }
    if (item.status === "completed") throw new Error("완료 취소 후 집중을 시작해 주세요.");
    const active = await tx.focusSession.findFirst({ where: { endedAt: null } });
    return active ?? tx.focusSession.create({
      data: {
        workdayItemId: itemId,
        taskTitleSnapshot: item.titleSnapshot,
        projectTitleSnapshot: item.task?.project?.title ?? null,
        areaTitleSnapshot: item.task?.project?.area?.title ?? item.task?.area?.title ?? null,
        taskIdSnapshot: item.taskId,
        projectIdSnapshot: item.task?.projectId ?? null,
        areaIdSnapshot: item.task?.project?.areaId ?? item.task?.areaId ?? null,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  redirect(`/focus/${session.id}`);
}

export async function endFocus(form: FormData) {
  const sessionId = idFrom(form, "sessionId");
  const durationSeconds = await prisma.$transaction(async (tx) => {
    const session = await tx.focusSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (!session.endedAt) {
      const endedAt = new Date();
      const duration = Math.max(0, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000));
      await tx.focusSession.update({ where: { id: sessionId }, data: { endedAt, durationSeconds: duration } });
      return duration;
    }
    return session.durationSeconds ?? 0;
  });
  revalidatePath("/");
  return durationSeconds;
}

export async function updateWeeklyFocusGoal(form: FormData) {
  const weeklyFocusMinutes = z.coerce.number().int().min(30).max(10080).parse(form.get("weeklyFocusMinutes"));
  const weekStart = dateKeyToDate(dateSchema.parse(form.get("weekStart")));
  const currentWeekStart = dateKeyToDate(futureDateKey(0));
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - ((currentWeekStart.getUTCDay() + 6) % 7));
  if (weekStart.getTime() !== currentWeekStart.getTime()) throw new Error("현재 주의 목표만 변경할 수 있습니다.");
  await prisma.$transaction(async (tx) => {
    const existing = await tx.weeklyFocusGoal.findFirst({ where: { weekStart } });
    if (existing) await tx.weeklyFocusGoal.update({
      where: { id: existing.id },
      data: { weeklyFocusMinutes, timezone: WORKDAY_TIME_ZONE },
    });
    else await tx.weeklyFocusGoal.create({
      data: { weekStart, weeklyFocusMinutes, timezone: WORKDAY_TIME_ZONE },
    });
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
