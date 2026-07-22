import Link from "next/link";
import { carryAll, carryItem, endWorkday } from "@/lib/actions";
import { getWorkdayView } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { formatDuration, formatWorkdayDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";
export default async function Summary() {
  const workday = await prisma.workday.findFirst({ where: { status: "active" } });
  if (!workday) return <main className="shell centered"><h1>진행 중인 작업일이 없습니다</h1><Link className="button" href="/">준비 화면으로</Link></main>;
  const view = await getWorkdayView(workday.id);
  const done = view.items.filter(i => i.status === "completed"), pending = view.items.filter(i => i.status === "planned");
  const carriedIds = new Set((await prisma.workdayItem.findMany({ where: { carriedFromItemId: { in: pending.map(i => i.id) } }, select: { carriedFromItemId: true } })).map(i => i.carriedFromItemId));
  return <main className="shell narrow"><header className="pageHeader"><div><p className="eyebrow">{formatWorkdayDate(view.workdayDate)} 작업일</p><h1>작업일 요약</h1></div><div className="total"><span>총 집중 시간</span><strong>{formatDuration(view.totalSeconds)}</strong></div></header>
    <section className="summarySection"><h2>완료 <span>{done.length}</span></h2>{done.length ? done.map(i => <div className="summaryRow" key={i.id}><span>{i.title}</span><strong>{formatDuration(i.seconds)}</strong></div>) : <p className="empty">완료한 항목이 없습니다.</p>}</section>
    <section className="summarySection"><div className="sectionTitle"><h2>미완료 <span>{pending.length}</span></h2>{pending.length > 0 && <form action={carryAll}><input type="hidden" name="workdayId" value={view.id}/><button className="textButton accent">미완료 전체 다음 작업일로 넘기기</button></form>}</div>
      {pending.length ? pending.map(i => <div className="summaryRow" key={i.id}><div><span>{i.title}</span><small>{formatDuration(i.seconds)}</small></div>{carriedIds.has(i.id) ? <span className="carried">이월됨</span> : <form action={carryItem}><input type="hidden" name="itemId" value={i.id}/><button className="button secondary">다음 작업일로 넘기기</button></form>}</div>) : <p className="empty">미완료 항목이 없습니다.</p>}
    </section>
    <div className="summaryActions"><Link href="/" className="button secondary">작업일로 돌아가기</Link><form action={endWorkday}><input type="hidden" name="workdayId" value={view.id}/><button className="button danger">작업일 종료</button></form></div>
  </main>;
}
