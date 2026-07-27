import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit, EditableText } from "@/components/editable-text";
import { TaskPlanningFields } from "@/components/task-planning-fields";
import { TaskSchedulePicker } from "@/components/task-schedule-picker";
import { archiveTask, createSubtask, deleteTask, moveTaskToProject, updateTask } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate, getWorkdayDate } from "@/lib/workday-date";
import { parseTaskSort, sortTasks } from "@/lib/task-sort";

export const dynamic = "force-dynamic";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const sort = parseTaskSort(params.sort);
  const today = getWorkdayDate();
  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: null, status: "active", parentTaskId: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        recurrenceRule: true,
        items: { where: { status: "planned", recurrenceRuleId: null, workday: { workdayDate: { gte: dateKeyToDate(today) }, status: { not: "completed" } } }, include: { workday: true }, orderBy: { workday: { workdayDate: "asc" } } },
        subtasks: {
          where: { status: "active" },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { recurrenceRule: true, items: { where: { status: "planned", recurrenceRuleId: null, workday: { workdayDate: { gte: dateKeyToDate(today) }, status: { not: "completed" } } }, include: { workday: true }, orderBy: { workday: { workdayDate: "asc" } } } },
        },
      },
    }),
    prisma.project.findMany({ where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  const sortedTasks = sortTasks(tasks, sort);
  return <main className="shell"><AppNav/>
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "빠른 수집" : "QUICK CAPTURE"}</p><h1>{locale === "ko" ? "받은편지함" : "Inbox"}</h1><p className="lede">{locale === "ko" ? "아직 프로젝트를 정하지 않은 작업입니다. 일정이나 프로젝트를 정하면 자연스럽게 다음 단계로 이동합니다." : "Tasks without a project. Schedule them or move them into a project when ready."}</p></div><span className="status">{tasks.length}{locale === "ko" ? "개" : ""}</span></header>
    <form className="sortBar" method="get"><label><span>{locale === "ko" ? "정렬" : "Sort"}</span><select name="sort" defaultValue={sort}><option value="manual">{locale === "ko" ? "기본 순서" : "Default order"}</option><option value="title">{locale === "ko" ? "이름" : "Title"}</option><option value="newest">{locale === "ko" ? "최근 생성" : "Newest"}</option><option value="estimate">{locale === "ko" ? "예상 시간" : "Estimate"}</option></select></label><button className="textButton">{locale === "ko" ? "적용" : "Apply"}</button></form>
    <section className="panel inboxPanel">
      {sortedTasks.map(task => <article className="inboxTask" key={task.id}>
        <div className="inboxTaskMain"><EditableText action={updateTask} idName="taskId" id={task.id} value={task.title} label={locale === "ko" ? "작업 이름 수정" : "Rename task"}/>{task.items.length > 0 && <small>{locale === "ko" ? "예정: " : "Scheduled: "}{task.items.map(item => item.workday.workdayDate.toISOString().slice(0,10)).join(", ")}</small>}</div>
        <div className="taskPlanActions">
          <TaskSchedulePicker taskId={task.id} locale={locale} scheduledItem={task.items[0] ? { id: task.items[0].id, date: task.items[0].workday.workdayDate.toISOString().slice(0, 10) } : null}/>
          {projects.length > 0 && <form action={moveTaskToProject} className="projectAction"><input type="hidden" name="taskId" value={task.id}/><select name="projectId" aria-label={locale === "ko" ? "프로젝트 선택" : "Choose project"} defaultValue=""><option value="" disabled>{locale === "ko" ? "프로젝트로 이동" : "Move to project"}</option>{projects.map(project => <option value={project.id} key={project.id}>{project.title}</option>)}</select><button className="textButton">{locale === "ko" ? "이동" : "Move"}</button></form>}
          <form action={archiveTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton muted">{locale === "ko" ? "보관" : "Archive"}</button></form>
          <ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={locale === "ko" ? `‘${task.title}’을 삭제할까요? 날짜별 기록의 제목은 유지됩니다.` : `Delete “${task.title}”? Workday snapshots will remain.`}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit>
        </div>
        <TaskPlanningFields taskId={task.id} estimatedMinutes={task.estimatedMinutes} rule={task.recurrenceRule} locale={locale}/>
        <details className="subtaskGroup">
          <summary>{locale === "ko" ? "하위 작업" : "Subtasks"} <span>{task.subtasks.length}</span></summary>
          <div className="subtaskList">{task.subtasks.map(subtask => <article className="subtaskRow" key={subtask.id}>
            <div><EditableText action={updateTask} idName="taskId" id={subtask.id} value={subtask.title} label={locale === "ko" ? "하위 작업 이름 수정" : "Rename subtask"}/>{subtask.items.length > 0 && <small>{locale === "ko" ? "예정: " : "Scheduled: "}{subtask.items.map(item => item.workday.workdayDate.toISOString().slice(0,10)).join(", ")}</small>}</div>
            <div className="subtaskActions"><TaskSchedulePicker taskId={subtask.id} locale={locale} compact scheduledItem={subtask.items[0] ? { id: subtask.items[0].id, date: subtask.items[0].workday.workdayDate.toISOString().slice(0, 10) } : null}/><form action={archiveTask}><input type="hidden" name="taskId" value={subtask.id}/><button className="textButton muted">{locale === "ko" ? "보관" : "Archive"}</button></form><ConfirmSubmit action={deleteTask} fields={{ taskId: subtask.id }} message={locale === "ko" ? `‘${subtask.title}’ 하위 작업을 삭제할까요?` : `Delete subtask “${subtask.title}”?`}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit></div>
            <TaskPlanningFields taskId={subtask.id} estimatedMinutes={subtask.estimatedMinutes} rule={subtask.recurrenceRule} locale={locale}/>
          </article>)}</div>
          <form action={createSubtask} className="subtaskCreate"><input type="hidden" name="parentTaskId" value={task.id}/><input name="title" maxLength={120} required placeholder={locale === "ko" ? "새 하위 작업" : "New subtask"} aria-label={locale === "ko" ? "새 하위 작업 이름" : "New subtask name"}/><button className="textButton accent">{locale === "ko" ? "추가" : "Add"}</button></form>
        </details>
      </article>)}
      {!tasks.length && <div className="emptyState"><p>{locale === "ko" ? "받은편지함이 비어 있습니다. 오른쪽 아래의 빠른 추가로 새 작업을 수집하세요." : "Inbox is clear. Use Quick add to capture a task."}</p></div>}
    </section>
  </main>;
}
