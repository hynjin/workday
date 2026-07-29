import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit } from "@/components/editable-text";
import { deleteArea, deleteProject, deleteTask, restoreArea, restoreProject, restoreTask } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const locale = await getLocale();
  const [areas, projects, tasks] = await Promise.all([
    prisma.area.findMany({ where: { status: "archived" }, orderBy: { archivedAt: "desc" } }),
    prisma.project.findMany({ where: { status: "archived" }, orderBy: { archivedAt: "desc" } }),
    prisma.task.findMany({ where: { status: "archived", parentTaskId: null }, orderBy: { archivedAt: "desc" } }),
  ]);
  const groups = [
    { key: "project", title: locale === "ko" ? "프로젝트" : "Projects", rows: projects },
    { key: "area", title: locale === "ko" ? "영역" : "Areas", rows: areas },
    { key: "task", title: locale === "ko" ? "작업" : "Tasks", rows: tasks },
  ] as const;
  return <main className="wd-app"><AppNav/><section className="wd-main">
    <header className="wd-page-head"><div><span className="wd-eyebrow">{locale === "ko" ? "잠시 치워둔 항목" : "ARCHIVED ITEMS"}</span><h1>{locale === "ko" ? "보관함" : "Archive"}</h1><span className="wd-muted">{locale === "ko" ? "보관한 프로젝트, 영역과 작업을 한곳에서 관리해요." : "Manage archived projects, Areas, and tasks in one place."}</span></div></header>
    <nav className="wd-tabs">{groups.map(group => <a href={`#${group.key}`} key={group.key}>{group.title} <span>{group.rows.length}</span></a>)}</nav>
    <div className="wd-archive-groups">{groups.map(group => <section id={group.key} key={group.key}><div className="wd-content-head"><h3>{group.title}</h3><span className="wd-muted">{group.rows.length}</span></div>
      <div className="wd-archive-list">{group.rows.map(row => <article className="wd-archive-row" key={row.id}><span><i className={`wd-dot ${"color" in row ? row.color : "gray"}`}/>{row.title}</span><div>
        {group.key === "project" ? <><form action={restoreProject}><input type="hidden" name="projectId" value={row.id}/><button className="textButton accent">{locale === "ko" ? "복원" : "Restore"}</button></form><ConfirmSubmit action={deleteProject} fields={{ projectId: row.id }} message={locale === "ko" ? "프로젝트를 완전히 삭제할까요?" : "Delete this project permanently?"}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit></> : group.key === "area" ? <><form action={restoreArea}><input type="hidden" name="areaId" value={row.id}/><button className="textButton accent">{locale === "ko" ? "복원" : "Restore"}</button></form><ConfirmSubmit action={deleteArea} fields={{ areaId: row.id }} message={locale === "ko" ? "영역을 완전히 삭제할까요?" : "Delete this area permanently?"}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit></> : <><form action={restoreTask}><input type="hidden" name="taskId" value={row.id}/><button className="textButton accent">{locale === "ko" ? "복원" : "Restore"}</button></form><ConfirmSubmit action={deleteTask} fields={{ taskId: row.id }} message={locale === "ko" ? "작업을 완전히 삭제할까요?" : "Delete this task permanently?"}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit></>}
      </div></article>)}
      {!group.rows.length && <p className="wd-empty-inline">{locale === "ko" ? "보관된 항목이 없습니다." : "No archived items."}</p>}</div>
    </section>)}</div>
  </section></main>;
}
