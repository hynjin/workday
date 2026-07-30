"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  quickAddTask,
  deleteRecurrenceRule,
  deleteTaskFromToday,
  archiveTask,
  moveTaskToArea,
  moveTaskToProject,
  removeWorkdayItem,
  reorderWorkdayItem,
  startFocus,
  syncTaskSchedule,
  toggleItemComplete,
  undoRemoveWorkdayItem,
  updateRecurrenceRule,
  updateDailyGoal,
  updateTask,
} from "@/lib/actions";
import { signOut } from "@/lib/auth-actions";

export async function completeScheduleItem(formData: FormData) {
  await toggleItemComplete(formData);
}

export async function startScheduleFocus(formData: FormData) {
  await startFocus(formData);
}

export async function reorderScheduleItem(itemId: string, targetIndex: number) {
  await reorderWorkdayItem(itemId, targetIndex);
}

export async function removeScheduleItem(formData: FormData) {
  await removeWorkdayItem(formData);
}

export async function deleteScheduleTask(formData: FormData) {
  await deleteTaskFromToday(formData);
}

export async function archiveScheduleTask(formData: FormData) {
  const archiveData = new FormData();
  archiveData.set("taskId", String(formData.get("itemId") ?? ""));
  await archiveTask(archiveData);
}

export async function undoScheduleRemoval(formData: FormData) {
  await undoRemoveWorkdayItem(formData);
}

export async function createScheduleTask(formData: FormData) {
  await quickAddTask(formData);
}

export async function updateScheduleTask(formData: FormData) {
  await updateTask(formData);
  if (formData.get("itemId")) await updateDailyGoal(formData);
  const taskId = String(formData.get("taskId") ?? "");
  const location = String(formData.get("location") ?? "");
  const moveData = new FormData();
  moveData.set("taskId", taskId);
  if (location.startsWith("project:")) {
    moveData.set("projectId", location.slice(8));
    await moveTaskToProject(moveData);
  } else {
    moveData.set("areaId", location.startsWith("area:") ? location.slice(5) : "");
    await moveTaskToArea(moveData);
  }
  await syncTaskSchedule(formData);
  const repeat = String(formData.get("repeat") ?? "none");
  const recurrenceData = new FormData();
  recurrenceData.set("taskId", taskId);
  if (repeat === "none") {
    await deleteRecurrenceRule(recurrenceData);
    return;
  }
  const startsOn = String(formData.get("date"));
  const start = new Date(`${startsOn}T00:00:00Z`);
  recurrenceData.set("frequency", repeat);
  recurrenceData.set("interval", "1");
  recurrenceData.set("startsOn", startsOn);
  recurrenceData.set("monthDay", String(start.getUTCDate()));
  recurrenceData.append("weekdays", String(start.getUTCDay()));
  await updateRecurrenceRule(recurrenceData);
}

export async function changeScheduleLocale(nextLocale: "ko" | "en") {
  (await cookies()).set("workday-locale", nextLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/");
}

export async function signOutFromSchedule() {
  await signOut();
}
