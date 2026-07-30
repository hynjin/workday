import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit } from "@/components/editable-text";
import { TaskSchedulePicker } from "@/components/task-schedule-picker";
import { archiveArea, archiveTask, deleteArea, deleteTask } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate, getWorkdayDate } from "@/lib/workday-date";
import { AreaProjectButton, AreaTaskButton, EditAreaDialog, NewAreaButton } from "@/components/area-dialogs";
import { formatDuration } from "@/lib/workday-date";
import { TaskEditDialog } from "@/components/task-edit-dialog";
import { WorkdayIcon } from "@/components/workday-icon";

export const dynamic = "force-dynamic";

export default async function AreasPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const today = dateKeyToDate(getWorkdayDate());
  const areas = await prisma.area.findMany({ where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { tasks: true, projects: true } } } });
  const selectedSummary = areas.find(area => area.id === params.area) ?? areas[0] ?? null;
  const selected = selectedSummary ? await prisma.area.findUniqueOrThrow({
    where: { id: selectedSummary.id },
    include: {
      projects: { where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { tasks: true } } } },
      tasks: {
        where: { status: "active", projectId: null, parentTaskId: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          recurrenceRule: { select: { frequency: true } },
          items: { where: { status: "planned", recurrenceRuleId: null, workday: { workdayDate: { gte: today }, status: { not: "completed" } } }, include: { workday: true }, orderBy: { workday: { workdayDate: "asc" } } },
          subtasks: { where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        },
      },
    },
  }) : null;
  const [availableProjects, focusSummary] = await Promise.all([
    prisma.project.findMany({
      where: { status: "active" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, color: true },
    }),
    selected ? prisma.focusSession.aggregate({
      where: { endedAt: { not: null }, areaIdSnapshot: selected.id },
      _sum: { durationSeconds: true },
    }) : Promise.resolve({ _sum: { durationSeconds: null } }),
  ]);

  return <main className="wd-app"><AppNav/><section className="wd-main">
    <header className="wd-page-head"><div><span className="wd-eyebrow">{locale === "ko" ? "지속적으로 관리하는 영역" : "AREAS"}</span><h1>{locale === "ko" ? "영역" : "Areas"}</h1><span className="wd-muted">{locale === "ko" ? "꾸준히 관리할 습관과 관련 프로젝트를 한곳에 모아요." : "Keep ongoing responsibilities and projects together."}</span></div><NewAreaButton locale={locale}/></header>
    <div className="wd-workspace">
      <aside className="wd-rail"><div className="wd-rail-head"><button className="railCollapse" type="button" aria-label={locale === "ko" ? "영역 목록 접기" : "Collapse Areas"}><WorkdayIcon name="chevronLeft" size={16}/></button></div><nav>{areas.map(area => <Link scroll={false} className={area.id === selected?.id ? "is-active" : ""} href={`/areas?area=${area.id}`} key={area.id}><span><i className={`wd-dot ${area.color}`}/><b>{area.title}</b></span><small>{area._count.tasks + area._count.projects}</small></Link>)}</nav></aside>
      <section className="wd-workspace-detail">{selected ? <>
        <header className="wd-detail-head"><div className="wd-detail-title"><i className={`wd-dot ${selected.color}`}/><h2>{selected.title}</h2></div><details className="wd-more-menu"><summary aria-label={locale === "ko" ? "영역 메뉴" : "Area menu"}><WorkdayIcon name="more"/></summary><div><EditAreaDialog area={{id:selected.id,title:selected.title,color:selected.color}} locale={locale}/><form action={archiveArea}><input type="hidden" name="areaId" value={selected.id}/><button>{locale === "ko" ? "보관" : "Archive"}</button></form><ConfirmSubmit action={deleteArea} fields={{ areaId: selected.id }} message={locale === "ko" ? "영역을 삭제할까요?" : "Delete this Area?"}><button className="dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit></div></details></header>
        <div className="wd-stats"><div><span>{locale === "ko" ? "프로젝트" : "Projects"}</span><strong>{selected.projects.length}</strong></div><div><span>{locale === "ko" ? "직접 작업" : "Direct tasks"}</span><strong>{selected.tasks.length}</strong></div><div><span>{locale === "ko" ? "누적 집중" : "Total focus"}</span><strong>{formatDuration(focusSummary._sum.durationSeconds ?? 0, false, locale)}</strong></div></div>
        <section className="wd-content-section"><div className="wd-content-head"><h3>{locale === "ko" ? "프로젝트" : "Projects"}</h3><AreaProjectButton areaId={selected.id} projects={availableProjects.filter(project => !selected.projects.some(current => current.id === project.id))} locale={locale}/></div><div className="wd-project-grid">{selected.projects.map(project => <Link href={`/projects?project=${project.id}`} key={project.id}><span>{project.title}<small>{locale === "ko" ? `작업 ${project._count.tasks}개` : `${project._count.tasks} tasks`}</small></span><b>›</b></Link>)}{!selected.projects.length && <p className="wd-empty-inline">{locale === "ko" ? "연결된 프로젝트가 없습니다." : "No linked projects."}</p>}</div></section>
        <section className="wd-content-section"><div className="wd-content-head"><h3>{locale === "ko" ? "직접 작업" : "Direct tasks"}</h3><AreaTaskButton areaId={selected.id} locale={locale}/></div><div className="wd-area-tasks">{selected.tasks.map(task => {
          const item = task.items[0];
          const scheduledItem = item ? { id: item.id, date: item.workday.workdayDate.toISOString().slice(0, 10) } : null;
          return <article className="wd-area-task" key={task.id}><div><strong>{task.title}</strong><span>{task.subtasks.length ? (locale === "ko" ? `하위 작업 ${task.subtasks.length}개` : `${task.subtasks.length} subtasks`) : (locale === "ko" ? "일정 없음" : "No schedule")}</span></div><div><TaskSchedulePicker taskId={task.id} locale={locale} compact scheduledItem={scheduledItem}/><details className="wd-more-menu"><summary aria-label={locale === "ko" ? "작업 메뉴" : "Task menu"}><WorkdayIcon name="more"/></summary><div><TaskEditDialog task={{ id:task.id,title:task.title,priority:task.priority,estimatedMinutes:task.estimatedMinutes,projectId:task.projectId,areaId:task.areaId,scheduledItem,repeat:task.recurrenceRule?.frequency ?? "none" }} projects={availableProjects} areas={areas.map(area => ({id:area.id,title:area.title,color:area.color}))} locale={locale}/><form action={archiveTask}><input type="hidden" name="taskId" value={task.id}/><button>{locale === "ko" ? "보관" : "Archive"}</button></form><ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={locale === "ko" ? `‘${task.title}’ 작업을 삭제할까요?` : `Delete “${task.title}”?`}><button className="dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit></div></details></div></article>;
        })}{!selected.tasks.length && <p className="wd-empty-inline">{locale === "ko" ? "영역에 직접 연결된 작업이 없습니다." : "No tasks are directly linked to this Area."}</p>}</div></section>
      </> : <div className="wd-empty"><p>{locale === "ko" ? "첫 영역을 만들어 지속적인 범위를 정리하세요." : "Create your first Area for ongoing responsibilities."}</p></div>}</section>
    </div>
  </section></main>;
}
