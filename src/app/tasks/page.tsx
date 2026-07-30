import Link from "next/link";
import { Prisma } from "@prisma/client";
import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit } from "@/components/editable-text";
import { TaskSchedulePicker } from "@/components/task-schedule-picker";
import { archiveTask, deleteTask } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate, getWorkdayDate } from "@/lib/workday-date";
import { OpenQuickAddButton } from "@/components/open-quick-add-button";
import { TaskEditDialog } from "@/components/task-edit-dialog";
import { WorkdayIcon } from "@/components/workday-icon";

export const dynamic = "force-dynamic";

type Filter = "inbox" | "today" | "upcoming" | "unscheduled" | "completed";
const filters: Filter[] = ["inbox", "today", "upcoming", "unscheduled", "completed"];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const filter: Filter = filters.includes(params.filter as Filter) ? params.filter as Filter : "inbox";
  const todayKey = getWorkdayDate();
  const today = dateKeyToDate(todayKey);
  const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const active = { status: "active" as const };
  let where: Prisma.TaskWhereInput;
  if (filter === "inbox") where = { ...active, projectId: null, areaId: null };
  else if (filter === "today") where = { ...active, items: { some: { workday: { workdayDate: today } } } };
  else if (filter === "upcoming") where = { ...active, items: { some: { status: "planned", workday: { workdayDate: { gte: tomorrow }, status: { not: "completed" } } } } };
  else if (filter === "unscheduled") where = { ...active, items: { none: { status: "planned", workday: { workdayDate: { gte: today }, status: { not: "completed" } } } } };
  else where = { items: { some: { status: "completed" } } };

  const [tasks, projects, areas] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        project: { select: { id: true, title: true, color: true } },
        area: { select: { id: true, title: true, color: true } },
        parentTask: { select: { title: true } },
        recurrenceRule: { select: { frequency: true } },
        items: {
          where: filter === "completed"
            ? { status: "completed" }
            : { status: "planned", recurrenceRuleId: null, workday: { workdayDate: { gte: today }, status: { not: "completed" } } },
          include: { workday: { select: { workdayDate: true } } },
          orderBy: { workday: { workdayDate: "desc" } },
        },
      },
    }),
    prisma.project.findMany({ where: { status: "active" }, orderBy: { title: "asc" }, select: { id: true, title: true, color: true } }),
    prisma.area.findMany({ where: { status: "active" }, orderBy: { title: "asc" }, select: { id: true, title: true, color: true } }),
  ]);

  const label = {
    inbox: locale === "ko" ? "수집함" : "Inbox",
    today: locale === "ko" ? "오늘" : "Today",
    upcoming: locale === "ko" ? "예정" : "Upcoming",
    unscheduled: locale === "ko" ? "미정" : "Unscheduled",
    completed: locale === "ko" ? "완료 기록" : "Completed",
  };
  return <main className="wd-app"><AppNav/><section className="wd-main">
    <header className="wd-page-head"><div><span className="wd-eyebrow">{locale === "ko" ? "작업 모음" : "TASKS"}</span><h1>{locale === "ko" ? "작업" : "Tasks"}</h1><span className="wd-muted">{locale === "ko" ? "해야 할 일을 한곳에서 정리해요." : "Organize everything in one place."}</span></div><OpenQuickAddButton label={locale === "ko" ? "새 작업" : "New task"}/></header>
    <nav className="wd-tabs" aria-label={locale === "ko" ? "작업 필터" : "Task filters"}>{filters.map(item => <Link className={item === filter ? "is-active" : ""} href={`/tasks?filter=${item}`} key={item}>{label[item]}</Link>)}</nav>
    <section className="wd-directory">
      {tasks.map(task => {
        const item = task.items[0];
        const scheduledItem = item && item.status === "planned" ? { id: item.id, date: item.workday.workdayDate.toISOString().slice(0, 10) } : null;
        const location = task.project?.title ?? task.area?.title ?? (locale === "ko" ? "수집함" : "Inbox");
        const locationColor = task.project?.color ?? task.area?.color ?? "sky";
        return <article className="wd-directory-row" key={task.id}>
          <div className="wd-directory-copy"><strong>{task.title}</strong><div><span><i className={`wd-dot ${locationColor}`}/>{location}</span>{task.parentTask && <span>{locale === "ko" ? "하위 작업 · " : "Subtask · "}{task.parentTask.title}</span>}{filter === "completed" && item && <time>{item.workday.workdayDate.toISOString().slice(0, 10)}</time>}</div></div>
          <div className="wd-directory-actions">
            {filter !== "completed" && <TaskSchedulePicker taskId={task.id} locale={locale} compact scheduledItem={scheduledItem}/>}
            <details className="wd-more-menu"><summary aria-label={locale === "ko" ? "작업 메뉴" : "Task menu"}><WorkdayIcon name="more"/></summary><div>
              <TaskEditDialog task={{ id: task.id, title: task.title, priority: task.priority, estimatedMinutes: task.estimatedMinutes, projectId: task.projectId, areaId: task.areaId, scheduledItem, repeat: task.recurrenceRule?.frequency ?? "none" }} projects={projects} areas={areas} locale={locale}/>
              <form action={archiveTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton muted">{locale === "ko" ? "보관" : "Archive"}</button></form>
              <ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={locale === "ko" ? `‘${task.title}’ 작업을 삭제할까요?` : `Delete “${task.title}”?`}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit>
            </div></details>
          </div>
        </article>;
      })}
      {!tasks.length && <div className="wd-empty"><p>{locale === "ko" ? `${label[filter]}에 표시할 작업이 없습니다.` : `There are no tasks in ${label[filter]}.`}</p></div>}
    </section>
  </section></main>;
}
