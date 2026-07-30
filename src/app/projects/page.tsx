import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit } from "@/components/editable-text";
import { ProjectTaskBoard } from "@/components/project-task-board";
import { ProjectRailLinks } from "@/components/project-rail-links";
import { archiveProject, completeProject, deleteProject, setProjectViewMode, undoMoveTaskToInbox } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { parseTaskSort, sortTasks } from "@/lib/task-sort";
import { dateKeyToDate, formatDuration, getWorkdayDate } from "@/lib/workday-date";
import { EditProjectDialog, NewProjectButton, NewSectionButton } from "@/components/project-dialogs";
import { OpenQuickAddButton } from "@/components/open-quick-add-button";
import { WorkdayIcon } from "@/components/workday-icon";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ project?: string; sort?: string; moved?: string; fromProject?: string }> }) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const today = getWorkdayDate();
  const sort = parseTaskSort(params.sort);
  const [projects, areas] = await Promise.all([
    prisma.project.findMany({
      where: { status: "active" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { area: { select: { title: true, color: true } }, tasks: { where: { status: "active", parentTaskId: null }, select: { id: true } } },
    }),
    prisma.area.findMany({ where: { status: "active" }, orderBy: { title: "asc" }, select: { id: true, title: true, color: true } }),
  ]);
  const selectedSummary = projects.find(project => project.id === params.project) ?? projects[0] ?? null;
  const selected = selectedSummary ? await prisma.project.findUniqueOrThrow({
    where: { id: selectedSummary.id },
    include: {
      sections: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      area: { select: { id: true, title: true, color: true } },
      tasks: {
        where: { status: "active", parentTaskId: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          recurrenceRule: true,
          items: { select: { id: true, status: true, recurrenceRuleId: true, workday: { select: { workdayDate: true, status: true } }, focusSessions: true } },
          subtasks: {
            where: { status: "active" },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { id: true, title: true, items: { select: { id: true, status: true, recurrenceRuleId: true, workday: { select: { workdayDate: true, status: true } }, focusSessions: true } } },
          },
        },
      },
    },
  }) : null;

  const taskViews = selected ? sortTasks(selected.tasks.map(task => {
    const subtaskItems = task.subtasks.flatMap(subtask => subtask.items);
    const allItems = [...task.items, ...subtaskItems];
    const sessions = allItems.flatMap(item => item.focusSessions);
    const focusSeconds = sessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
    const scheduledItem = task.items.find(item => item.status === "planned" && item.recurrenceRuleId === null && item.workday.status !== "completed" && item.workday.workdayDate >= dateKeyToDate(today));
    return {
      id: task.id,
      title: task.title,
      sectionId: task.sectionId,
      sortOrder: task.sortOrder,
      createdAt: task.createdAt,
      estimatedMinutes: task.estimatedMinutes,
      priority: task.priority,
      focusSeconds,
      sessionCount: sessions.length,
      completedCount: allItems.filter(item => item.status === "completed").length,
      scheduledItem: scheduledItem ? { id: scheduledItem.id, date: scheduledItem.workday.workdayDate.toISOString().slice(0, 10) } : null,
      recurrenceRule: task.recurrenceRule ? {
        frequency: task.recurrenceRule.frequency,
        interval: task.recurrenceRule.interval,
        weekdays: task.recurrenceRule.weekdays,
        monthDay: task.recurrenceRule.monthDay,
        startsOn: task.recurrenceRule.startsOn.toISOString(),
        endsOn: task.recurrenceRule.endsOn?.toISOString() ?? null,
      } : null,
      subtasks: task.subtasks.map(subtask => {
        const scheduled = subtask.items.find(item => item.status === "planned" && item.recurrenceRuleId === null && item.workday.status !== "completed" && item.workday.workdayDate >= dateKeyToDate(today));
        return { id: subtask.id, title: subtask.title, scheduledItem: scheduled ? { id: scheduled.id, date: scheduled.workday.workdayDate.toISOString().slice(0, 10) } : null };
      }),
    };
  }), sort) : [];
  const projectSeconds = taskViews.reduce((sum, task) => sum + task.focusSeconds, 0);
  const projectSessions = taskViews.reduce((sum, task) => sum + task.sessionCount, 0);
  const completedOccurrences = taskViews.reduce((sum, task) => sum + task.completedCount, 0);

  const nextSchedule = taskViews.map(task => task.scheduledItem?.date).filter(Boolean).sort()[0];
  const progress = taskViews.length ? Math.min(100, Math.round(completedOccurrences / taskViews.length * 100)) : 0;
  return <main className="wd-app"><AppNav/><section className="wd-main">
    <header className="wd-page-head"><div><span className="wd-eyebrow">{locale === "ko" ? "끝이 있는 목표" : "PROJECTS"}</span><h1>{locale === "ko" ? "프로젝트" : "Projects"}</h1><span className="wd-muted">{locale === "ko" ? "완료를 향해 움직이는 작업을 묶어서 관리해요." : "Group work that moves toward a clear outcome."}</span></div><NewProjectButton areas={areas} locale={locale}/></header>
    <div className="wd-workspace">
      <aside className="wd-rail"><div className="wd-rail-head"><button className="railCollapse" type="button" aria-label={locale === "ko" ? "프로젝트 목록 접기" : "Collapse projects"}><WorkdayIcon name="chevronLeft" size={16}/></button></div><ProjectRailLinks projects={projects.map(project => ({ id: project.id, title: project.title, color: project.color, taskCount: project.tasks.length }))} selectedId={selected?.id}/></aside>
      <section className="wd-workspace-detail">
        {params.moved && params.fromProject === selected?.id && <aside className="wd-notice"><span>{locale === "ko" ? "작업을 수집함으로 이동했습니다." : "Task moved to Inbox."}</span><form action={undoMoveTaskToInbox}><input type="hidden" name="taskId" value={params.moved}/><input type="hidden" name="projectId" value={params.fromProject}/><button className="wd-text-button">{locale === "ko" ? "실행 취소" : "Undo"}</button></form></aside>}
        {selected ? <>
          <header className="wd-detail-head"><div><div className="wd-detail-title"><i className={`wd-dot ${selected.color}`}/><h2>{selected.title}</h2></div>{selected.area && <Link className="wd-area-link" href={`/areas?area=${selected.area.id}`}><i className={`wd-dot ${selected.area.color}`}/>{selected.area.title}</Link>}</div><details className="wd-more-menu"><summary aria-label={locale === "ko" ? "프로젝트 메뉴" : "Project menu"}><WorkdayIcon name="more"/></summary><div><EditProjectDialog project={{id:selected.id,title:selected.title,color:selected.color,areaId:selected.areaId}} areas={areas} locale={locale}/><form action={completeProject}><input type="hidden" name="projectId" value={selected.id}/><button>{locale === "ko" ? "완료" : "Complete"}</button></form><form action={archiveProject}><input type="hidden" name="projectId" value={selected.id}/><button>{locale === "ko" ? "보관" : "Archive"}</button></form><ConfirmSubmit action={deleteProject} fields={{ projectId: selected.id }} message={locale === "ko" ? `‘${selected.title}’ 프로젝트를 삭제할까요?` : `Delete “${selected.title}”?`}><button className="dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit></div></details></header>
          <div className="wd-project-summary"><div><span>{locale === "ko" ? "진행률" : "Progress"}</span><strong>{progress}%</strong><i><b style={{width:`${progress}%`}}/></i></div><div><span>{locale === "ko" ? "다음 일정" : "Next schedule"}</span><strong>{nextSchedule ?? "—"}</strong></div><div><span>{locale === "ko" ? "누적 집중" : "Total focus"}</span><strong>{formatDuration(projectSeconds, false, locale)}</strong></div></div>
          <div className="wd-project-toolbar"><div className="wd-view-switch"><form action={setProjectViewMode}><input type="hidden" name="projectId" value={selected.id}/><input type="hidden" name="viewMode" value="list"/><button className={selected.viewMode === "list" ? "is-active" : ""}><WorkdayIcon name="list" size={15}/>{locale === "ko" ? "목록" : "List"}</button></form><form action={setProjectViewMode}><input type="hidden" name="projectId" value={selected.id}/><input type="hidden" name="viewMode" value="board"/><button className={selected.viewMode === "board" ? "is-active" : ""}><WorkdayIcon name="board" size={15}/>{locale === "ko" ? "보드" : "Board"}</button></form></div><div className="wd-project-tools">{selected.viewMode === "board" && <NewSectionButton projectId={selected.id} locale={locale}/>}<OpenQuickAddButton compact location={`project:${selected.id}`} label={locale === "ko" ? "작업" : "Task"}/></div></div>
          <ProjectTaskBoard key={selected.id} projectId={selected.id} viewMode={selected.viewMode} sections={selected.sections} tasks={taskViews} locale={locale} reorderEnabled={sort === "manual"} projects={projects.map(project => ({id:project.id,title:project.title,color:project.color}))} areas={areas}/>
          <div className="wd-project-foot"><span>{locale === "ko" ? `집중 세션 ${projectSessions}회` : `${projectSessions} focus sessions`}</span><span>{locale === "ko" ? `활성 작업 ${taskViews.length}개` : `${taskViews.length} active tasks`}</span></div>
        </> : <div className="wd-empty"><p>{locale === "ko" ? "첫 프로젝트를 만들어 보세요." : "Create your first project."}</p></div>}
      </section>
    </div>
  </section></main>;
}
