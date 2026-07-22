import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { carryAll, carryItem } from "@/lib/actions";
import { getOrCreateCurrentWorkday, getWorkdayView } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { formatDuration, formatWorkdayDate, nextDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";
export default async function Summary({ searchParams }: { searchParams: Promise<{ workdayId?: string }> }) {
  const params = await searchParams;
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
    <header className="pageHeader"><div><p className="eyebrow">{formatWorkdayDate(view.workdayDate)} 작업일</p><h1>작업일 요약</h1><p className="lede">회고 입력 없이 실제 집중 기록과 완료 여부만 보여줍니다.</p></div><span className="status">{view.status === "completed" ? "종료됨" : view.status === "active" ? "진행 중" : "준비 중"}</span></header>
    <section className="summaryStats"><div><span>총 집중</span><strong>{formatDuration(view.totalSeconds)}</strong></div><div><span>집중 세션</span><strong>{view.totalSessions}회</strong></div><div><span>완료</span><strong>{done.length}개</strong></div><div><span>미완료</span><strong>{pending.length}개</strong></div></section>
    <section className="summarySection"><h2>완료 <span>{done.length}</span></h2>{done.length ? done.map(i => <div className="summaryRow" key={i.id}><span>{i.title}</span><div className="summaryMeta"><strong>{formatDuration(i.seconds)}</strong><small>{i.sessionCount}회 집중</small></div></div>) : <p className="empty">완료한 항목이 없습니다.</p>}</section>
    <section className="summarySection"><div className="sectionTitle"><h2>미완료 <span>{pending.length}</span></h2>{canCarry && pending.length > 0 && <form action={carryAll}><input type="hidden" name="workdayId" value={view.id}/><button className="textButton accent">미완료 전체 다음 작업일로 넘기기</button></form>}</div>
      {pending.length ? pending.map(i => <div className="summaryRow" key={i.id}><div><span>{i.title}</span><small>{formatDuration(i.seconds)} · {i.sessionCount}회 집중</small></div>{carriedIds.has(i.id) ? <span className="carried">이월됨</span> : canCarry ? <form action={carryItem}><input type="hidden" name="itemId" value={i.id}/><button className="button secondary">다음 작업일로 넘기기</button></form> : null}</div>) : <p className="empty">미완료 항목이 없습니다.</p>}
    </section>
    {history.length > 0 && <section className="history"><div className="sectionTitle"><h2>작업일 기록</h2>{workday.id !== current.id && <Link className="textButton accent" href="/summary">오늘 작업일 보기</Link>}</div><div><Link className={workday.id === current.id ? "currentDay" : ""} href="/summary">오늘</Link>{history.filter(day => day.id !== current.id).map(day => <Link className={day.id === workday.id ? "currentDay" : ""} key={day.id} href={`/summary?workdayId=${day.id}`}>{formatWorkdayDate(day.workdayDate)}</Link>)}</div></section>}
    <div className="summaryActions"><Link href="/" className="button secondary">이번 작업일로 돌아가기</Link></div>
  </main>;
}
