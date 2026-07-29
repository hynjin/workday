import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { scheduleTaskForDate } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getWorkdayDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }, locale] = await Promise.all([searchParams, getLocale()]);
  const query = q.trim().slice(0, 120);
  const [tasks, projects] = query ? await Promise.all([
    prisma.task.findMany({
      where: {
        status: "active",
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { project: { title: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: { project: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 50,
    }),
    prisma.project.findMany({
      where: { status: "active", title: { contains: query, mode: "insensitive" } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 20,
    }),
  ]) : [[], []];
  const today = getWorkdayDate();

  return <main className="wd-app"><AppNav/><section className="wd-main">
    <header className="wd-page-head"><div><span className="wd-eyebrow">{locale === "ko" ? "전체 탐색" : "GLOBAL FIND"}</span><h1>{locale === "ko" ? "검색" : "Search"}</h1><span className="wd-muted">{locale === "ko" ? "작업 제목과 프로젝트 이름을 함께 검색합니다." : "Search task titles and project names together."}</span></div></header>
    <form className="wd-search-hero" action="/search"><input type="search" name="q" defaultValue={query} placeholder={locale === "ko" ? "찾을 작업이나 프로젝트" : "Task or project"} autoFocus/><button className="wd-button is-primary">{locale === "ko" ? "검색" : "Search"}</button></form>
    {!query && <div className="wd-empty"><p>{locale === "ko" ? "검색어를 입력해 주세요." : "Enter a search term."}</p></div>}
    {query && <div className="wd-search-results">
      <section><div className="wd-content-head"><h3>{locale === "ko" ? "프로젝트" : "Projects"}</h3><span className="wd-muted">{projects.length}</span></div>{projects.map(project => <Link className="wd-search-row" href={`/projects?project=${project.id}`} key={project.id}><strong>{project.title}</strong><span>{locale === "ko" ? "프로젝트 열기" : "Open project"} →</span></Link>)}{!projects.length && <p className="wd-empty-inline">{locale === "ko" ? "일치하는 프로젝트가 없습니다." : "No matching projects."}</p>}</section>
      <section><div className="wd-content-head"><h3>{locale === "ko" ? "작업" : "Tasks"}</h3><span className="wd-muted">{tasks.length}</span></div>{tasks.map(task => <article className="wd-search-row" key={task.id}><div><strong>{task.title}</strong><small>{task.project?.title ?? (locale === "ko" ? "수집함" : "Inbox")}{task.estimatedMinutes ? ` · ${task.estimatedMinutes}${locale === "ko" ? "분" : "m"}` : ""}</small></div><form action={scheduleTaskForDate}><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="date" value={today}/><button className="wd-text-button">{locale === "ko" ? "오늘" : "Today"}</button></form></article>)}{!tasks.length && <p className="wd-empty-inline">{locale === "ko" ? "일치하는 작업이 없습니다." : "No matching tasks."}</p>}</section>
    </div>}
  </section></main>;
}
