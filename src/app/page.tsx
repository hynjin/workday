import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { addWorkdayItem, startFocus, startWorkday, toggleItemComplete } from "@/lib/actions";
import { getOrCreateCurrentWorkday, getWorkdayView } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { formatDuration, formatWorkdayDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

function SubmitButton({ children, secondary = false }: { children: React.ReactNode; secondary?: boolean }) {
  return <button className={secondary ? "button secondary" : "button"} type="submit">{children}</button>;
}

export default async function Home() {
  const workday = await getOrCreateCurrentWorkday();
  const activeSession = await prisma.focusSession.findFirst({ where: { endedAt: null }, select: { id: true } });
  if (activeSession) return <main className="shell centered"><p className="eyebrow">진행 중인 세션</p><h1>집중을 이어가세요</h1><Link className="button" href={`/focus/${activeSession.id}`}>타이머로 돌아가기</Link></main>;
  return workday.status === "active" ? <Active workdayId={workday.id} /> : <Planning workdayId={workday.id} />;
}

async function Planning({ workdayId }: { workdayId: string }) {
  const view = await getWorkdayView(workdayId);
  const carried = view.items.filter((item) => item.carriedFromItemId);
  return <main className="shell">
    <AppNav />
    <header className="pageHeader"><div><p className="eyebrow">{formatWorkdayDate(view.workdayDate)} 작업일</p><h1>이번 작업일 준비</h1><p className="lede">오늘 실제로 손댈 일만 골라 두세요. 순서는 정하지 않아도 됩니다.</p></div><span className="status">준비 중</span></header>
    <div className="planningSolo">
      <section className="panel todayPanel"><div className="sectionTitle"><h2>이번 작업일 할 일</h2><Link className="textButton accent" href="/library">전체 목록에서 고르기</Link></div>
        {carried.length > 0 && <div className="carryBox"><strong>이어서 할 일</strong>{carried.map((item) => <span key={item.id}>{item.title}</span>)}</div>}
        <form action={addWorkdayItem} className="rowForm"><input type="hidden" name="workdayId" value={view.id}/><label className="sr-only" htmlFor="quick-title">즉흥 작업 제목</label><input id="quick-title" name="title" placeholder="직접 추가할 일" maxLength={120} required/><SubmitButton>추가</SubmitButton></form>
        <div className="todayList">{view.items.map((item) => <div className="todayItem" key={item.id}><span>{item.title}</span>{item.taskId ? <small>전체 목록에서 추가</small> : <small>직접 추가</small>}</div>)}{!view.items.length && <p className="empty">오늘 할 일을 추가하면 여기에 표시됩니다.</p>}</div>
        <form action={startWorkday}><input type="hidden" name="workdayId" value={view.id}/><button className="button full" disabled={!view.items.length}>작업일 시작</button></form>
      </section>
    </div>
  </main>;
}

async function Active({ workdayId }: { workdayId: string }) {
  const view = await getWorkdayView(workdayId);
  return <main className="shell">
    <AppNav />
    <header className="pageHeader"><div><p className="eyebrow">{formatWorkdayDate(view.workdayDate)} 작업일</p><h1>이번 작업일</h1></div><div className="total"><span>총 집중</span><strong>{formatDuration(view.totalSeconds)}</strong></div></header>
    <section className="panel"><div className="sectionTitle"><h2>오늘 할 일</h2><span>{view.items.filter(i => i.status === "completed").length}/{view.items.length} 완료</span></div>
      <div className="workList">{view.items.map((item) => <article className={`workItem ${item.status === "completed" ? "done" : ""}`} key={item.id}>
        <div><h3>{item.title}</h3><p>오늘 누적 <strong>{formatDuration(item.seconds)}</strong></p></div>
        <div className="actions"><form action={startFocus}><input type="hidden" name="itemId" value={item.id}/><SubmitButton secondary>집중 시작</SubmitButton></form><form action={toggleItemComplete}><input type="hidden" name="itemId" value={item.id}/><SubmitButton>{item.status === "completed" ? "완료 취소" : "완료"}</SubmitButton></form></div>
      </article>)}</div>
      <details className="addDuring"><summary>+ 할 일 추가</summary><form action={addWorkdayItem} className="rowForm"><input type="hidden" name="workdayId" value={view.id}/><label className="sr-only" htmlFor="during-title">새 작업 제목</label><input id="during-title" name="title" placeholder="지금 추가할 일" maxLength={120} required/><SubmitButton>추가</SubmitButton></form></details>
    </section>
    <div className="footerAction"><Link className="button secondary" href="/library">전체 목록 · 작업 준비</Link><Link className="button secondary" href="/summary">작업일 요약</Link></div>
  </main>;
}
