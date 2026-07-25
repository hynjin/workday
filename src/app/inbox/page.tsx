import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit, EditableText } from "@/components/editable-text";
import { archiveTask, deleteTask, moveTaskToProject, scheduleTaskForDate, updateTask } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate, getWorkdayDate, nextDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const locale = await getLocale();
  const today = getWorkdayDate();
  const tomorrow = nextDate(dateKeyToDate(today)).toISOString().slice(0, 10);
  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: null, status: "active" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { items: { where: { workday: { workdayDate: { gte: dateKeyToDate(today) } } }, include: { workday: true }, orderBy: { workday: { workdayDate: "asc" } } } },
    }),
    prisma.project.findMany({ where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  return <main className="shell"><AppNav/>
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "빠른 수집" : "QUICK CAPTURE"}</p><h1>{locale === "ko" ? "받은편지함" : "Inbox"}</h1><p className="lede">{locale === "ko" ? "아직 프로젝트를 정하지 않은 작업입니다. 일정이나 프로젝트를 정하면 자연스럽게 다음 단계로 이동합니다." : "Tasks without a project. Schedule them or move them into a project when ready."}</p></div><span className="status">{tasks.length}{locale === "ko" ? "개" : ""}</span></header>
    <section className="panel inboxPanel">
      {tasks.map(task => <article className="inboxTask" key={task.id}>
        <div className="inboxTaskMain"><EditableText action={updateTask} idName="taskId" id={task.id} value={task.title} label={locale === "ko" ? "작업 이름 수정" : "Rename task"}/>{task.items.length > 0 && <small>{locale === "ko" ? "예정: " : "Scheduled: "}{task.items.map(item => item.workday.workdayDate.toISOString().slice(0,10)).join(", ")}</small>}</div>
        <div className="taskPlanActions">
          <form action={scheduleTaskForDate}><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="date" value={today}/><button className="textButton accent">{locale === "ko" ? "오늘" : "Today"}</button></form>
          <form action={scheduleTaskForDate}><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="date" value={tomorrow}/><button className="textButton accent">{locale === "ko" ? "내일" : "Tomorrow"}</button></form>
          <form action={scheduleTaskForDate} className="dateAction"><input type="hidden" name="taskId" value={task.id}/><input type="date" name="date" min={today} defaultValue={today}/><button className="textButton">{locale === "ko" ? "계획" : "Plan"}</button></form>
          {projects.length > 0 && <form action={moveTaskToProject} className="projectAction"><input type="hidden" name="taskId" value={task.id}/><select name="projectId" aria-label={locale === "ko" ? "프로젝트 선택" : "Choose project"} defaultValue=""><option value="" disabled>{locale === "ko" ? "프로젝트로 이동" : "Move to project"}</option>{projects.map(project => <option value={project.id} key={project.id}>{project.title}</option>)}</select><button className="textButton">{locale === "ko" ? "이동" : "Move"}</button></form>}
          <form action={archiveTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton muted">{locale === "ko" ? "보관" : "Archive"}</button></form>
          <ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={locale === "ko" ? `‘${task.title}’을 삭제할까요? 날짜별 기록의 제목은 유지됩니다.` : `Delete “${task.title}”? Workday snapshots will remain.`}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit>
        </div>
      </article>)}
      {!tasks.length && <div className="emptyState"><p>{locale === "ko" ? "받은편지함이 비어 있습니다. 오른쪽 아래의 빠른 추가로 새 작업을 수집하세요." : "Inbox is clear. Use Quick add to capture a task."}</p></div>}
    </section>
  </main>;
}
