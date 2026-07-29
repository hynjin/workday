import Link from "next/link";
import { Prisma } from "@prisma/client";
import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit, EditableText } from "@/components/editable-text";
import { TaskSchedulePicker } from "@/components/task-schedule-picker";
import { archiveTask, deleteTask, moveTaskToArea, moveTaskToProject, updateTask } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate, getWorkdayDate } from "@/lib/workday-date";
import { OpenQuickAddButton } from "@/components/open-quick-add-button";

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
        items: {
          where: filter === "completed"
            ? { status: "completed" }
            : { status: "planned", recurrenceRuleId: null, workday: { workdayDate: { gte: today }, status: { not: "completed" } } },
          include: { workday: { select: { workdayDate: true } } },
          orderBy: { workday: { workdayDate: "desc" } },
        },
      },
    }),
    prisma.project.findMany({ where: { status: "active" }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.area.findMany({ where: { status: "active" }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  const label = {
    inbox: locale === "ko" ? "Inbox" : "Inbox",
    today: locale === "ko" ? "오늘" : "Today",
    upcoming: locale === "ko" ? "예정" : "Upcoming",
    unscheduled: locale === "ko" ? "미정" : "Unscheduled",
    completed: locale === "ko" ? "완료 기록" : "Completed",
  };
  return <main className="shell"><AppNav/>
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "모든 작업" : "ALL TASKS"}</p><h1>{locale === "ko" ? "작업" : "Tasks"}</h1><p className="lede">{locale === "ko" ? "소속과 일정 상태에 따라 필요한 작업을 찾아보세요." : "Find tasks by location and schedule."}</p></div><OpenQuickAddButton label={locale === "ko" ? "새 작업" : "New task"}/></header>
    <nav className="taskFilters" aria-label={locale === "ko" ? "작업 필터" : "Task filters"}>{filters.map(item => <Link className={item === filter ? "active" : ""} href={`/tasks?filter=${item}`} key={item}>{label[item]}</Link>)}</nav>
    <section className="panel taskDirectory">
      {tasks.map(task => {
        const item = task.items[0];
        const scheduledItem = item && item.status === "planned" ? { id: item.id, date: item.workday.workdayDate.toISOString().slice(0, 10) } : null;
        const location = task.project?.title ?? task.area?.title ?? (locale === "ko" ? "수집함" : "Inbox");
        const locationColor = task.project?.color ?? task.area?.color ?? "sky";
        return <article className="taskDirectoryRow" key={task.id}>
          <div className="taskDirectoryMain"><EditableText action={updateTask} idName="taskId" id={task.id} value={task.title} label={locale === "ko" ? "작업 이름 수정" : "Rename task"}/><div className="taskMeta"><span className="locationBadge"><i className={`colorDot ${locationColor}`}/>{location}</span>{task.parentTask && <span>{locale === "ko" ? "하위 작업 · " : "Subtask · "}{task.parentTask.title}</span>}{filter === "completed" && item && <time>{item.workday.workdayDate.toISOString().slice(0, 10)}</time>}</div></div>
          <div className="taskDirectoryActions">
            {filter !== "completed" && <TaskSchedulePicker taskId={task.id} locale={locale} compact scheduledItem={scheduledItem}/>}
            <details className="moreMenu"><summary aria-label={locale === "ko" ? "작업 메뉴" : "Task menu"}>⋯</summary><div>
              {(task.projectId || task.areaId) && <form action={moveTaskToArea}><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="areaId" value=""/><button className="textButton">Inbox로 이동</button></form>}
              {areas.map(area => <form action={moveTaskToArea} key={area.id}><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="areaId" value={area.id}/><button className="textButton">{locale === "ko" ? `${area.title} Area로 이동` : `Move to Area: ${area.title}`}</button></form>)}
              {projects.map(project => <form action={moveTaskToProject} key={project.id}><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="projectId" value={project.id}/><button className="textButton">{locale === "ko" ? `${project.title} 프로젝트로 이동` : `Move to Project: ${project.title}`}</button></form>)}
              <form action={archiveTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton muted">{locale === "ko" ? "보관" : "Archive"}</button></form>
              <ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={locale === "ko" ? `‘${task.title}’ 작업을 삭제할까요?` : `Delete “${task.title}”?`}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit>
            </div></details>
          </div>
        </article>;
      })}
      {!tasks.length && <div className="emptyState"><p>{locale === "ko" ? `${label[filter]}에 표시할 작업이 없습니다.` : `There are no tasks in ${label[filter]}.`}</p></div>}
    </section>
  </main>;
}
