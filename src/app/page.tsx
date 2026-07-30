import { redirect } from "next/navigation";
import { getOrCreateCurrentWorkday, getWorkdayView } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { dateKeyToDate, getWorkdayDate } from "@/lib/workday-date";
import { ownedWorkdayWhere } from "@/lib/auth";
import { ApprovedSchedulePresentation, formatScheduleEyebrow, type ScheduleItem, type ScheduleSearchItem } from "@/presentation/schedule/schedule-view";
import {
  changeScheduleLocale,
  archiveScheduleTask,
  completeScheduleItem,
  createScheduleTask,
  deleteScheduleTask,
  removeScheduleItem,
  reorderScheduleItem,
  signOutFromSchedule,
  startScheduleFocus,
  undoScheduleRemoval,
  updateScheduleTask,
} from "@/adapters/schedule-actions";

export const dynamic = "force-dynamic";

function validDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ date?: string; month?: string; removed?: string; focused?:string }> }) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const todayKey = getWorkdayDate();
  const current = await getOrCreateCurrentWorkday();
  const selectedKey = validDate(params.date) ?? todayKey;
  const selected = selectedKey === todayKey
    ? current
    : await prisma.workday.findUnique({ where: await ownedWorkdayWhere(dateKeyToDate(selectedKey)) });
  const view = selected ? await getWorkdayView(selected.id) : {
    id: "",
    workdayDate: dateKeyToDate(selectedKey),
    status: (selectedKey < todayKey ? "completed" : "planning") as "completed" | "planning",
    items: [],
    totalSeconds: 0,
    totalSessions: 0,
  };
  const activeSession = await prisma.focusSession.findFirst({ where: { endedAt: null }, select: { id: true } });
  if (activeSession && selectedKey === todayKey) redirect(`/focus/${activeSession.id}`);

  const monthKey = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : selectedKey.slice(0, 7);
  const monthStart = dateKeyToDate(`${monthKey}-01`);
  const monthEnd = new Date(monthStart); monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const records = await prisma.workday.findMany({
    where: {
      workdayDate: { gte: monthStart, lt: monthEnd },
      items: { some: { dismissedAt: null } },
    },
    select: { workdayDate: true },
  });
  const recordedDates = new Set(records.map(day => day.workdayDate.toISOString().slice(0, 10)));
  const dayCount = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  const days = Array.from({ length: dayCount }, (_, index) => {
    const key = `${monthKey}-${String(index + 1).padStart(2, "0")}`;
    return { key, hasWorkday: recordedDates.has(key), selected: key === selectedKey, today: key === todayKey };
  });
  const isToday = selectedKey === todayKey;
  const isPast = selectedKey < todayKey;
  const actionable = isToday && view.status !== "completed";
  const taskIds = [...new Set(view.items.map(item => item.taskId).filter((id): id is string => Boolean(id)))];
  const [taskProjects, taskAreas, scheduledItems, recurrenceRules] = await Promise.all([
    prisma.project.findMany({ where:{ status:"active" }, orderBy:{ title:"asc" }, select:{ id:true,title:true,color:true } }),
    prisma.area.findMany({ where:{ status:"active" }, orderBy:{ title:"asc" }, select:{ id:true,title:true,color:true } }),
    taskIds.length ? prisma.workdayItem.findMany({
      where: {
        taskId: { in: taskIds },
        dismissedAt: null,
        workday: { workdayDate: { gte: dateKeyToDate(isPast ? selectedKey : todayKey) } },
      },
      select: { taskId:true, workday:{ select:{ workdayDate:true } } },
    }) : Promise.resolve([]),
    taskIds.length ? prisma.recurrenceRule.findMany({
      where: { taskId:{ in:taskIds } },
      select: { taskId:true, startsOn:true },
    }) : Promise.resolve([]),
  ]);
  const previousMonth = new Date(monthStart);
  previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
  const nextMonth = new Date(monthStart);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const options = [
    ...taskProjects.map(project => ({ ...project, kind: "project" as const })),
    ...taskAreas.map(area => ({ ...area, kind: "area" as const })),
  ];
  const scheduledByTask = new Map<string,string[]>();
  for (const scheduled of scheduledItems) {
    if (!scheduled.taskId) continue;
    const dates = scheduledByTask.get(scheduled.taskId) ?? [];
    dates.push(scheduled.workday.workdayDate.toISOString().slice(0,10));
    scheduledByTask.set(scheduled.taskId,dates);
  }
  const repeatStartByTask = new Map(recurrenceRules.map(rule=>[rule.taskId,rule.startsOn.toISOString().slice(0,10)]));
  const items: ScheduleItem[] = view.items.map(item => ({
    id: item.id,
    taskId: item.taskId,
    title: item.title,
    status: item.status,
    projectTitle: item.projectTitle,
    locationColor: item.locationColor,
    priority: item.priority,
    estimatedMinutes: item.estimatedMinutes,
    dailyGoalMinutes: item.dailyGoalMinutes,
    focusedSeconds: item.seconds,
    projectId: item.projectId,
    areaId: item.areaId,
    repeat: item.repeat,
    scheduledDates: item.repeat==="none"
      ? [...new Set(item.taskId?(scheduledByTask.get(item.taskId)??[selectedKey]):[selectedKey])].sort()
      : [item.taskId?(repeatStartByTask.get(item.taskId)??selectedKey):selectedKey],
  }));
  const searchItems: ScheduleSearchItem[] = [
    ...items.map(item => ({
      id: item.taskId ?? item.id,
      title: item.title,
      color: item.locationColor,
      kind: "task" as const,
      meta: item.projectTitle ?? (locale === "ko" ? "수집함" : "Inbox"),
      href: "/tasks",
    })),
    ...taskProjects.map(project => ({ id: project.id, title: project.title, color: project.color, kind: "project" as const, meta: locale === "ko" ? "프로젝트" : "Project", href: `/projects?project=${project.id}` })),
    ...taskAreas.map(area => ({ id: area.id, title: area.title, color: area.color, kind: "area" as const, meta: locale === "ko" ? "영역" : "Area", href: `/areas?area=${area.id}` })),
  ];
  return <ApprovedSchedulePresentation
    locale={locale}
    selectedKey={selectedKey}
    todayKey={todayKey}
    monthKey={monthKey}
    monthLabel={new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-CA", { timeZone: "UTC", year: "numeric", month: "long" }).format(monthStart)}
    monthOffset={monthStart.getUTCDay()}
    previousMonth={previousMonth.toISOString().slice(0, 7)}
    nextMonth={nextMonth.toISOString().slice(0, 7)}
    title={isToday
      ? (locale === "ko" ? "오늘의 일정" : "Today's schedule")
      : locale === "ko"
        ? `${Number(selectedKey.slice(5,7))}월 ${Number(selectedKey.slice(8))}일 일정`
        : `Schedule for ${new Intl.DateTimeFormat("en-CA",{timeZone:"UTC",month:"long",day:"numeric"}).format(dateKeyToDate(selectedKey))}`}
    eyebrow={formatScheduleEyebrow(selectedKey)}
    items={items}
    days={days}
    totalSeconds={view.totalSeconds}
    actionable={actionable}
    removedItemId={params.removed}
    options={options}
    searchItems={searchItems}
    onComplete={completeScheduleItem}
    onStartFocus={startScheduleFocus}
    onRemove={removeScheduleItem}
    onUndoRemove={undoScheduleRemoval}
    onCreateTask={createScheduleTask}
    onUpdateTask={updateScheduleTask}
    onDeleteTask={deleteScheduleTask}
    onArchiveTask={archiveScheduleTask}
    onReorder={reorderScheduleItem}
    onLocaleChange={changeScheduleLocale}
    onSignOut={signOutFromSchedule}
    recordedFocusSeconds={Number.isFinite(Number(params.focused))?Math.max(0,Number(params.focused)):undefined}
  />;
}
