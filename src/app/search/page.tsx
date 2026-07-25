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

  return <main className="shell"><AppNav/>
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "전체 탐색" : "GLOBAL FIND"}</p><h1>{locale === "ko" ? "검색" : "Search"}</h1><p className="lede">{locale === "ko" ? "작업 제목과 프로젝트 이름을 함께 검색합니다." : "Search task titles and project names together."}</p></div>{query && <span className="status">{tasks.length + projects.length}</span>}</header>
    <form className="searchHero" action="/search"><input type="search" name="q" defaultValue={query} placeholder={locale === "ko" ? "찾을 작업이나 프로젝트" : "Task or project"} autoFocus/><button className="button">{locale === "ko" ? "검색" : "Search"}</button></form>
    {!query && <section className="panel emptyState"><p>{locale === "ko" ? "검색어를 입력해 주세요." : "Enter a search term."}</p></section>}
    {query && <div className="searchResults">
      <section className="panel"><div className="sectionTitle"><h2>{locale === "ko" ? "프로젝트" : "Projects"}</h2><span>{projects.length}</span></div>{projects.map(project => <Link className="searchResult" href={`/projects?project=${project.id}`} key={project.id}><strong>{project.title}</strong><span>{locale === "ko" ? "프로젝트 열기" : "Open project"} →</span></Link>)}{!projects.length && <p className="empty">{locale === "ko" ? "일치하는 프로젝트가 없습니다." : "No matching projects."}</p>}</section>
      <section className="panel"><div className="sectionTitle"><h2>{locale === "ko" ? "작업" : "Tasks"}</h2><span>{tasks.length}</span></div>{tasks.map(task => <article className="searchResult" key={task.id}><div><strong>{task.title}</strong><small>{task.project?.title ?? (locale === "ko" ? "받은편지함" : "Inbox")}{task.estimatedMinutes ? ` · ${task.estimatedMinutes}${locale === "ko" ? "분" : "m"}` : ""}</small></div><form action={scheduleTaskForDate}><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="date" value={today}/><button className="textButton accent">{locale === "ko" ? "오늘 추가" : "Add today"}</button></form></article>)}{!tasks.length && <p className="empty">{locale === "ko" ? "일치하는 작업이 없습니다." : "No matching tasks."}</p>}</section>
    </div>}
  </main>;
}
