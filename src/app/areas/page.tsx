import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit, EditableText } from "@/components/editable-text";
import { TaskSchedulePicker } from "@/components/task-schedule-picker";
import { archiveArea, archiveTask, createArea, createProject, createSubtask, createTask, deleteTask, updateArea, updateTask } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate, getWorkdayDate } from "@/lib/workday-date";

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
          items: { where: { status: "planned", recurrenceRuleId: null, workday: { workdayDate: { gte: today }, status: { not: "completed" } } }, include: { workday: true }, orderBy: { workday: { workdayDate: "asc" } } },
          subtasks: { where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        },
      },
    },
  }) : null;

  return <main className="shell"><AppNav/>
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "지속적으로 관리하는 범위" : "ONGOING RESPONSIBILITIES"}</p><h1>{locale === "ko" ? "영역" : "Areas"}</h1><p className="lede">{locale === "ko" ? "꾸준히 관리할 습관과 관련 프로젝트를 한곳에 모아요." : "Keep ongoing habits and related projects together."}</p></div><span className="status">{areas.length}</span></header>
    <div className="projectsWorkspace">
      <aside className="panel projectRail"><div className="railHeading"><h2>{locale === "ko" ? "영역" : "Areas"}</h2><button className="railCollapse" type="button" aria-label={locale === "ko" ? "영역 목록 접기" : "Collapse Areas"}>‹</button></div><nav>{areas.map(area => <Link scroll={false} className={area.id === selected?.id ? "active" : ""} href={`/areas?area=${area.id}`} key={area.id}><span><i className={`colorDot ${area.color}`}/>{area.title}</span><small>{area._count.tasks + area._count.projects}</small></Link>)}</nav><details className="categoryCreate"><summary><span aria-hidden="true">＋</span>{locale === "ko" ? "새 영역" : "New Area"}</summary><form action={createArea}><input name="title" required maxLength={120} placeholder={locale === "ko" ? "예: 영어 공부" : "e.g. English study"}/><fieldset className="colorChoices" aria-label={locale === "ko" ? "영역 색상" : "Area color"}>{["sky","mint","lilac","peach","butter"].map(color => <label key={color}><input type="radio" name="color" value={color} defaultChecked={color === "mint"}/><i className={`colorDot ${color}`}/></label>)}</fieldset><button className="button full">{locale === "ko" ? "만들기" : "Create"}</button></form></details></aside>
      <section className="projectWorkspaceMain">{selected ? <div className="panel projectTasks">
        <header className="taskWorkspaceHeader"><div><p className="workspaceLabel"><i className={`colorDot ${selected.color}`}/>{locale === "ko" ? "영역" : "AREA"}</p><EditableText action={updateArea} idName="areaId" id={selected.id} value={selected.title} label={locale === "ko" ? "영역 이름 수정" : "Rename Area"} className="categoryName"/></div><details className="moreMenu"><summary aria-label={locale === "ko" ? "영역 메뉴" : "Area menu"}>⋯</summary><div><form action={updateArea} className="menuColorForm"><input type="hidden" name="areaId" value={selected.id}/><input type="hidden" name="title" value={selected.title}/>{["sky","mint","lilac","peach","butter"].map(color => <button name="color" value={color} aria-label={`${color} color`} key={color}><i className={`colorDot ${color}`}/></button>)}</form><form action={archiveArea}><input type="hidden" name="areaId" value={selected.id}/><button className="textButton muted">{locale === "ko" ? "보관" : "Archive"}</button></form></div></details></header>
        <div className="projectCreateTools">
          <details className="addDetail"><summary>{locale === "ko" ? "작업 추가" : "Add task"}</summary><form action={createTask} className="rowForm detailCreate"><input type="hidden" name="areaId" value={selected.id}/><input name="title" required maxLength={120} placeholder={locale === "ko" ? "새 작업" : "New task"}/><button className="button secondary">{locale === "ko" ? "추가" : "Add"}</button></form></details>
          <details className="addDetail"><summary>{locale === "ko" ? "프로젝트 추가" : "Add project"}</summary><form action={createProject} className="rowForm detailCreate"><input type="hidden" name="areaId" value={selected.id}/><input name="title" required maxLength={120} placeholder={locale === "ko" ? "완료할 목표" : "Outcome to complete"}/><button className="button secondary">{locale === "ko" ? "추가" : "Add"}</button></form></details>
        </div>
        {selected.projects.length > 0 && <section className="areaProjects"><h2>{locale === "ko" ? "프로젝트" : "Projects"}</h2>{selected.projects.map(project => <Link href={`/projects?project=${project.id}`} key={project.id}><span>{project.title}</span><small>{project._count.tasks}</small></Link>)}</section>}
        <section className="areaTasks"><h2>{locale === "ko" ? "직접 작업" : "Direct tasks"}</h2>{selected.tasks.map(task => {
          const item = task.items[0];
          return <article className="taskDirectoryRow" key={task.id}><div className="taskDirectoryMain"><EditableText action={updateTask} idName="taskId" id={task.id} value={task.title} label={locale === "ko" ? "작업 이름 수정" : "Rename task"}/></div><div className="taskDirectoryActions"><TaskSchedulePicker taskId={task.id} locale={locale} compact scheduledItem={item ? { id: item.id, date: item.workday.workdayDate.toISOString().slice(0, 10) } : null}/><details className="moreMenu"><summary>⋯</summary><div><form action={archiveTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton muted">{locale === "ko" ? "보관" : "Archive"}</button></form><ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={locale === "ko" ? `‘${task.title}’ 작업을 삭제할까요?` : `Delete “${task.title}”?`}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit></div></details></div><details className="subtaskGroup compact"><summary>{locale === "ko" ? "하위 작업" : "Subtasks"} <span>{task.subtasks.length}</span></summary><form action={createSubtask} className="subtaskCreate"><input type="hidden" name="parentTaskId" value={task.id}/><input name="title" required maxLength={120} placeholder={locale === "ko" ? "새 하위 작업" : "New subtask"}/><button className="textButton accent">{locale === "ko" ? "추가" : "Add"}</button></form></details></article>;
        })}{!selected.tasks.length && <p className="columnEmpty">{locale === "ko" ? "Area에 직접 연결된 작업이 없습니다." : "No tasks are directly linked to this Area."}</p>}</section>
      </div> : <section className="panel emptyState"><p>{locale === "ko" ? "첫 Area를 만들어 지속적인 범위를 정리하세요." : "Create your first Area for ongoing responsibilities."}</p></section>}</section>
    </div>
  </main>;
}
