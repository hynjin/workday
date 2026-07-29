import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit, EditableText } from "@/components/editable-text";
import { ProjectTaskBoard } from "@/components/project-task-board";
import { ProjectRailLinks } from "@/components/project-rail-links";
import {
  archiveProject, completeProject, createAreaForProject, createProject, createSection, createTask, deleteProject,
  setProjectViewMode, undoMoveTaskToInbox, updateProject,
  updateProjectArea,
} from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { parseTaskSort, sortTasks } from "@/lib/task-sort";
import { dateKeyToDate, formatDuration, getWorkdayDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ project?: string; sort?: string; moved?: string; fromProject?: string }> }) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const today = getWorkdayDate();
  const sort = parseTaskSort(params.sort);
  const [projects, areas] = await Promise.all([
    prisma.project.findMany({
      where: { status: "active" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { area: { select: { title: true } }, tasks: { where: { status: "active", parentTaskId: null }, select: { id: true } } },
    }),
    prisma.area.findMany({ where: { status: "active" }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  const selectedSummary = projects.find(project => project.id === params.project) ?? projects[0] ?? null;
  const selected = selectedSummary ? await prisma.project.findUniqueOrThrow({
    where: { id: selectedSummary.id },
    include: {
      sections: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      area: { select: { id: true, title: true } },
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

  return <main className="shell"><AppNav/>
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "장기 작업 공간" : "LONG-TERM WORK"}</p><h1>{locale === "ko" ? "프로젝트" : "Projects"}</h1><p className="lede">{locale === "ko" ? "섹션으로 흐름을 설계하고 목록과 칸반을 오가며 작업을 정리합니다." : "Shape the workflow with sections and switch between list and Kanban views."}</p></div><span className="status">{projects.length}{locale === "ko" ? "개" : ""}</span></header>
    <div className="projectsWorkspace">
      <aside className="panel projectRail">
        <div className="railHeading"><h2>{locale === "ko" ? "프로젝트" : "Projects"}</h2><button className="railCollapse" type="button" aria-label={locale === "ko" ? "프로젝트 목록 접기" : "Collapse projects"} aria-expanded="true">‹</button></div>
        <ProjectRailLinks projects={projects.map(project => ({ id: project.id, title: project.title, color: project.color, taskCount: project.tasks.length }))} selectedId={selected?.id}/>
        <details className="categoryCreate"><summary><span aria-hidden="true">＋</span>{locale === "ko" ? "새 프로젝트" : "New project"}</summary><form action={createProject}><input name="title" placeholder={locale === "ko" ? "프로젝트 이름" : "Project name"} aria-label={locale === "ko" ? "프로젝트 이름" : "Project name"} required maxLength={120}/><select name="areaId" defaultValue=""><option value="">{locale === "ko" ? "영역 없음" : "No Area"}</option>{areas.map(area => <option value={area.id} key={area.id}>{area.title}</option>)}</select><fieldset className="colorChoices" aria-label={locale === "ko" ? "프로젝트 색상" : "Project color"}>{["sky","mint","lilac","peach","butter"].map(color => <label key={color}><input type="radio" name="color" value={color} defaultChecked={color === "sky"}/><i className={`colorDot ${color}`}/></label>)}</fieldset><button className="button full">{locale === "ko" ? "프로젝트 만들기" : "Create project"}</button></form></details>
      </aside>
      <section className="projectWorkspaceMain">
        {params.moved && params.fromProject === selected?.id && <aside className="actionNotice" role="status"><span>{locale === "ko" ? "작업을 Inbox로 이동했습니다." : "Task moved to Inbox."}</span><form action={undoMoveTaskToInbox}><input type="hidden" name="taskId" value={params.moved}/><input type="hidden" name="projectId" value={params.fromProject}/><button className="textButton accent">{locale === "ko" ? "실행 취소" : "Undo"}</button></form></aside>}
        {selected ? <>
        <div className="panel projectTasks">
          <header className="taskWorkspaceHeader"><div><p className="workspaceLabel">{locale === "ko" ? "프로젝트 컨테이너 · Task와 Subtask를 날짜에 실행" : "PROJECT CONTAINER · Schedule tasks and subtasks"}</p><EditableText action={updateProject} idName="projectId" id={selected.id} value={selected.title} label={locale === "ko" ? "프로젝트 이름 수정" : "Rename project"} className="categoryName"/>{selected.area && <Link className="locationBadge area" href={`/areas?area=${selected.area.id}`}>{selected.area.title}</Link>}<p>{locale === "ko" ? "프로젝트 자체가 아니라 Task와 선택적인 Subtask가 오늘 또는 다른 날짜의 실행 단위가 됩니다." : "Tasks and optional subtasks—not the project itself—are the units you schedule and execute."}</p></div><div className="libraryActions"><form action={completeProject}><input type="hidden" name="projectId" value={selected.id}/><button className="textButton accent">{locale === "ko" ? "프로젝트 완료" : "Complete project"}</button></form><form action={archiveProject}><input type="hidden" name="projectId" value={selected.id}/><button className="textButton muted">{locale === "ko" ? "보관" : "Archive"}</button></form><ConfirmSubmit action={deleteProject} fields={{ projectId: selected.id }} message={locale === "ko" ? `‘${selected.title}’ 프로젝트를 삭제할까요? 작업은 Inbox로 이동합니다.` : `Delete “${selected.title}”? Its tasks will move to Inbox.`}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit></div></header>
          <details className="projectAreaSettings">
            <summary>{locale === "ko" ? "Area 설정" : "Area settings"} · {selected.area?.title ?? (locale === "ko" ? "Area 없음" : "No Area")}</summary>
            <div>
              <form action={updateProjectArea} className="rowForm">
                <input type="hidden" name="projectId" value={selected.id}/>
                <select name="areaId" defaultValue={selected.area?.id ?? ""}>
                  <option value="">{locale === "ko" ? "Area 없음" : "No Area"}</option>
                  {areas.map(area => <option value={area.id} key={area.id}>{area.title}</option>)}
                </select>
                <button className="button secondary">{locale === "ko" ? "변경" : "Update"}</button>
              </form>
              <form action={createAreaForProject} className="rowForm">
                <input type="hidden" name="projectId" value={selected.id}/>
                <input name="title" required maxLength={120} placeholder={locale === "ko" ? "새 Area 이름" : "New Area name"}/>
                <button className="button secondary">{locale === "ko" ? "만들고 지정" : "Create & assign"}</button>
              </form>
            </div>
          </details>
          <div className="projectToolbar">
            <div className="viewSwitch" aria-label={locale === "ko" ? "프로젝트 보기 방식" : "Project view"}>
              <form action={setProjectViewMode}><input type="hidden" name="projectId" value={selected.id}/><input type="hidden" name="viewMode" value="list"/><button className={selected.viewMode === "list" ? "active" : ""}>{locale === "ko" ? "목록" : "List"}</button></form>
              <form action={setProjectViewMode}><input type="hidden" name="projectId" value={selected.id}/><input type="hidden" name="viewMode" value="board"/><button className={selected.viewMode === "board" ? "active" : ""}>{locale === "ko" ? "칸반" : "Board"}</button></form>
            </div>
            <form className="sortBar compact" method="get"><input type="hidden" name="project" value={selected.id}/><label><span>{locale === "ko" ? "정렬" : "Sort"}</span><select name="sort" defaultValue={sort}><option value="manual">{locale === "ko" ? "기본 순서" : "Default order"}</option><option value="title">{locale === "ko" ? "이름" : "Title"}</option><option value="newest">{locale === "ko" ? "최근 생성" : "Newest"}</option><option value="estimate">{locale === "ko" ? "예상 시간" : "Estimate"}</option></select></label><button className="textButton">{locale === "ko" ? "적용" : "Apply"}</button></form>
          </div>
          <div className="projectCreateTools">
            <details className="addDetail"><summary>{locale === "ko" ? "섹션 추가" : "Add section"}</summary><form action={createSection} className="rowForm detailCreate"><input type="hidden" name="projectId" value={selected.id}/><input name="title" placeholder={locale === "ko" ? "예: 진행 중" : "e.g. In progress"} aria-label={locale === "ko" ? "새 섹션 이름" : "New section name"} required maxLength={120}/><button className="button secondary">{locale === "ko" ? "추가" : "Add"}</button></form></details>
            <details className="addDetail"><summary>{locale === "ko" ? "작업 추가" : "Add task"}</summary><form action={createTask} className="rowForm detailCreate"><input type="hidden" name="projectId" value={selected.id}/><input name="title" placeholder={locale === "ko" ? "새 작업 이름" : "New task name"} aria-label={locale === "ko" ? "새 작업 이름" : "New task name"} required maxLength={120}/><button className="button secondary">{locale === "ko" ? "추가" : "Add"}</button></form></details>
          </div>
          <ProjectTaskBoard key={selected.id} projectId={selected.id} viewMode={selected.viewMode} sections={selected.sections} tasks={taskViews} locale={locale} reorderEnabled={sort === "manual"}/>
        </div>
        <section className="projectStats" aria-label={locale === "ko" ? "프로젝트 집중 통계" : "Project focus statistics"}>
          <div><span>{locale === "ko" ? "누적 집중" : "Total focus"}</span><strong>{formatDuration(projectSeconds, false, locale)}</strong></div>
          <div><span>{locale === "ko" ? "집중 세션" : "Sessions"}</span><strong>{projectSessions}{locale === "ko" ? "회" : ""}</strong></div>
          <div><span>{locale === "ko" ? "완료 발생 건" : "Completed occurrences"}</span><strong>{completedOccurrences}</strong></div>
          <div><span>{locale === "ko" ? "활성 작업" : "Active tasks"}</span><strong>{taskViews.length}</strong></div>
        </section>
      </> : <section className="panel emptyState"><p>{locale === "ko" ? "첫 프로젝트를 만들거나 받은편지함에 작업을 수집하세요." : "Create your first project or capture tasks in Inbox."}</p></section>}</section>
    </div>
  </main>;
}
