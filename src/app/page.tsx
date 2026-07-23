import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { startFocus, startWorkday, toggleItemComplete } from "@/lib/actions";
import { getOrCreateCurrentWorkday, getWorkdayView } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { formatDuration, formatWorkdayDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

function SubmitButton({ children, secondary = false }: { children: React.ReactNode; secondary?: boolean }) {
  return <button className={secondary ? "button secondary" : "button"} type="submit">{children}</button>;
}

export default async function Home() {
  const locale = await getLocale();
  const workday = await getOrCreateCurrentWorkday();
  const activeSession = await prisma.focusSession.findFirst({ where: { endedAt: null }, select: { id: true } });
  if (activeSession) return <main className="shell centered"><p className="eyebrow">{locale === "ko" ? "진행 중인 세션" : "ACTIVE SESSION"}</p><h1>{locale === "ko" ? "집중을 이어가세요" : "Keep your focus going"}</h1><Link className="button" href={`/focus/${activeSession.id}`}>{locale === "ko" ? "타이머로 돌아가기" : "Return to timer"}</Link></main>;
  return workday.status === "active" ? <Active workdayId={workday.id} locale={locale} /> : <Planning workdayId={workday.id} locale={locale} />;
}

async function Planning({ workdayId, locale }: { workdayId: string; locale: "ko" | "en" }) {
  const view = await getWorkdayView(workdayId);
  const carried = view.items.filter((item) => item.carriedFromItemId);
  return <main className="shell">
    <AppNav />
    <header className="pageHeader"><div><p className="eyebrow">{formatWorkdayDate(view.workdayDate, locale)} {locale === "ko" ? "작업일" : "WORKDAY"}</p><h1>{locale === "ko" ? "이번 작업일 준비" : "Plan this workday"}</h1><p className="lede">{locale === "ko" ? "오늘 실제로 손댈 일만 골라 두세요. 순서는 정하지 않아도 됩니다." : "Choose only the tasks you intend to work on. You do not need to order them."}</p></div><span className="status">{locale === "ko" ? "준비 중" : "Planning"}</span></header>
    <div className="planningSolo">
      <section className="panel todayPanel"><div className="sectionTitle"><h2>{locale === "ko" ? "이번 작업일 할 일" : "Tasks for this workday"}</h2><Link className="textButton accent" href="/library">{locale === "ko" ? "전체 목록에서 고르기" : "Choose from library"}</Link></div>
        {carried.length > 0 && <div className="carryBox"><strong>{locale === "ko" ? "이어서 할 일" : "Carried over"}</strong>{carried.map((item) => <span key={item.id}>{item.title}</span>)}</div>}
        <div className="todayList">{view.items.map((item) => <div className="todayItem" key={item.id}><span>{item.title}</span><small>{item.categoryTitle ?? (locale === "ko" ? "직접 추가" : "One-off")}</small></div>)}{!view.items.length && <p className="empty">{locale === "ko" ? "오늘 할 일을 추가하면 여기에 표시됩니다." : "Tasks added for today will appear here."}</p>}</div>
        <form action={startWorkday}><input type="hidden" name="workdayId" value={view.id}/><button className="button full" disabled={!view.items.length}>{locale === "ko" ? "작업일 시작" : "Start workday"}</button></form>
      </section>
    </div>
  </main>;
}

async function Active({ workdayId, locale }: { workdayId: string; locale: "ko" | "en" }) {
  const view = await getWorkdayView(workdayId);
  return <main className="shell">
    <AppNav />
    <header className="pageHeader"><div><p className="eyebrow">{formatWorkdayDate(view.workdayDate, locale)} {locale === "ko" ? "작업일" : "WORKDAY"}</p><h1>{locale === "ko" ? "이번 작업일" : "This workday"}</h1></div><div className="total"><span>{locale === "ko" ? "총 집중" : "Total focus"}</span><strong>{formatDuration(view.totalSeconds, false, locale)}</strong></div></header>
    <section className="panel"><div className="sectionTitle"><h2>{locale === "ko" ? "오늘 할 일" : "Today's tasks"}</h2><span>{view.items.filter(i => i.status === "completed").length}/{view.items.length} {locale === "ko" ? "완료" : "done"}</span></div>
      <div className="workList">{view.items.map((item) => <article className={`workItem ${item.status === "completed" ? "done" : ""}`} key={item.id}>
        <div><h3>{item.title}</h3><p>{item.categoryTitle && <><span className="itemCategory">{item.categoryTitle}</span> · </>}{locale === "ko" ? "오늘 누적" : "Today"} <strong>{formatDuration(item.seconds, false, locale)}</strong></p></div>
        <div className="actions">{item.status !== "completed" && <form action={startFocus}><input type="hidden" name="itemId" value={item.id}/><SubmitButton secondary>{locale === "ko" ? "집중 시작" : "Start focus"}</SubmitButton></form>}<form action={toggleItemComplete}><input type="hidden" name="itemId" value={item.id}/><SubmitButton>{item.status === "completed" ? (locale === "ko" ? "완료 취소" : "Undo") : (locale === "ko" ? "완료" : "Complete")}</SubmitButton></form></div>
      </article>)}</div>
      <Link className="addTaskLink" href="/library">+ {locale === "ko" ? "할 일 추가 · 전체 목록에서 관리" : "Add task · Manage library"}</Link>
    </section>
    <div className="footerAction"><Link className="button secondary" href="/summary">{locale === "ko" ? "작업일 요약" : "Workday summary"}</Link></div>
  </main>;
}
