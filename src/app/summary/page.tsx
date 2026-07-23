import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { carryAll, carryItem } from "@/lib/actions";
import { getOrCreateCurrentWorkday, getWorkdayView } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { formatDuration, formatWorkdayDate, nextDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";
export default async function Summary({ searchParams }: { searchParams: Promise<{ workdayId?: string }> }) {
  const params = await searchParams;
  const locale = await getLocale();
  const current = await getOrCreateCurrentWorkday();
  const selected = params.workdayId ? await prisma.workday.findUnique({ where: { id: params.workdayId } }) : current;
  const workday = selected ?? current;
  const [view, history] = await Promise.all([
    getWorkdayView(workday.id),
    prisma.workday.findMany({ where: { status: "completed" }, orderBy: { workdayDate: "desc" }, take: 7 }),
  ]);
  const done = view.items.filter(i => i.status === "completed"), pending = view.items.filter(i => i.status === "planned");
  const target = pending.length ? await prisma.workday.findUnique({ where: { workdayDate: nextDate(view.workdayDate) }, include: { items: true } }) : null;
  const carriedIds = new Set(pending.filter(source => target?.items.some(item => item.carriedFromItemId === source.id || (source.taskId ? item.taskId === source.taskId : !item.taskId && item.title.toLocaleLowerCase() === source.title.toLocaleLowerCase()))).map(item => item.id));
  const canCarry = view.status === "active";
  return <main className="shell narrow"><AppNav />
    <header className="pageHeader"><div><p className="eyebrow">{formatWorkdayDate(view.workdayDate, locale)} {locale === "ko" ? "작업일" : "WORKDAY"}</p><h1>{locale === "ko" ? "작업일 요약" : "Workday summary"}</h1><p className="lede">{locale === "ko" ? "회고 입력 없이 실제 집중 기록과 완료 여부만 보여줍니다." : "A factual view of focus records and completion status."}</p></div><span className="status">{view.status === "completed" ? (locale === "ko" ? "종료됨" : "Closed") : view.status === "active" ? (locale === "ko" ? "진행 중" : "Active") : (locale === "ko" ? "준비 중" : "Planning")}</span></header>
    <section className="summaryStats"><div><span>{locale === "ko" ? "총 집중" : "Total focus"}</span><strong>{formatDuration(view.totalSeconds, false, locale)}</strong></div><div><span>{locale === "ko" ? "집중 세션" : "Focus sessions"}</span><strong>{view.totalSessions}{locale === "ko" ? "회" : ""}</strong></div><div><span>{locale === "ko" ? "완료" : "Completed"}</span><strong>{done.length}</strong></div><div><span>{locale === "ko" ? "미완료" : "Open"}</span><strong>{pending.length}</strong></div></section>
    <section className="summarySection"><h2>{locale === "ko" ? "완료" : "Completed"} <span>{done.length}</span></h2>{done.length ? done.map(i => <div className="summaryRow" key={i.id}><span>{i.title}</span><div className="summaryMeta"><strong>{formatDuration(i.seconds, false, locale)}</strong><small>{i.sessionCount} {locale === "ko" ? "회 집중" : "sessions"}</small></div></div>) : <p className="empty">{locale === "ko" ? "완료한 항목이 없습니다." : "No completed tasks."}</p>}</section>
    <section className="summarySection"><div className="sectionTitle"><h2>{locale === "ko" ? "미완료" : "Open"} <span>{pending.length}</span></h2>{canCarry && pending.length > 0 && <form action={carryAll}><input type="hidden" name="workdayId" value={view.id}/><button className="textButton accent">{locale === "ko" ? "미완료 전체 다음 작업일로 넘기기" : "Carry all to next workday"}</button></form>}</div>
      {pending.length ? pending.map(i => <div className="summaryRow" key={i.id}><div><span>{i.title}</span><small>{formatDuration(i.seconds, false, locale)} · {i.sessionCount} {locale === "ko" ? "회 집중" : "sessions"}</small></div>{carriedIds.has(i.id) ? <span className="carried">{locale === "ko" ? "이월됨" : "Carried"}</span> : canCarry ? <form action={carryItem}><input type="hidden" name="itemId" value={i.id}/><button className="button secondary">{locale === "ko" ? "다음 작업일로 넘기기" : "Carry to next workday"}</button></form> : null}</div>) : <p className="empty">{locale === "ko" ? "미완료 항목이 없습니다." : "No open tasks."}</p>}
    </section>
    {history.length > 0 && <section className="history"><div className="sectionTitle"><h2>{locale === "ko" ? "작업일 기록" : "Workday history"}</h2>{workday.id !== current.id && <Link className="textButton accent" href="/summary">{locale === "ko" ? "오늘 작업일 보기" : "View today"}</Link>}</div><div><Link className={workday.id === current.id ? "currentDay" : ""} href="/summary">{locale === "ko" ? "오늘" : "Today"}</Link>{history.filter(day => day.id !== current.id).map(day => <Link className={day.id === workday.id ? "currentDay" : ""} key={day.id} href={`/summary?workdayId=${day.id}`}>{formatWorkdayDate(day.workdayDate, locale)}</Link>)}</div></section>}
    <div className="summaryActions"><Link href="/" className="button secondary">{locale === "ko" ? "이번 작업일로 돌아가기" : "Return to workday"}</Link></div>
  </main>;
}
