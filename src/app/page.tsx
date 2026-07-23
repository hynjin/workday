import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { WorkdayCalendar } from "@/components/workday-calendar";
import { saveWorkdayItemToLibrary, startFocus, startWorkday, toggleItemComplete } from "@/lib/actions";
import { getOrCreateCurrentWorkday, getWorkdayView } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { dateKeyToDate, formatDuration, formatWorkdayDate, getWorkdayDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

function validDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ date?: string; month?: string }> }) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const todayKey = getWorkdayDate();
  const current = await getOrCreateCurrentWorkday();
  const selectedKey = validDate(params.date) ?? todayKey;
  const selected = selectedKey === todayKey
    ? current
    : await prisma.workday.findUnique({ where: { workdayDate: dateKeyToDate(selectedKey) } });
  const workday = selected ?? current;
  const view = await getWorkdayView(workday.id);
  const activeSession = await prisma.focusSession.findFirst({ where: { endedAt: null }, select: { id: true } });
  if (activeSession && selectedKey === todayKey) return <main className="shell centered"><p className="eyebrow">{locale === "ko" ? "진행 중인 세션" : "ACTIVE SESSION"}</p><h1>{locale === "ko" ? "집중을 이어가세요" : "Keep your focus going"}</h1><Link className="button" href={`/focus/${activeSession.id}`}>{locale === "ko" ? "타이머로 돌아가기" : "Return to timer"}</Link></main>;

  const monthKey = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : selectedKey.slice(0, 7);
  const monthStart = dateKeyToDate(`${monthKey}-01`);
  const monthEnd = new Date(monthStart); monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const records = await prisma.workday.findMany({ where: { workdayDate: { gte: monthStart, lt: monthEnd } }, select: { workdayDate: true, status: true } });
  const recordMap = new Map(records.map(day => [day.workdayDate.toISOString().slice(0, 10), day.status]));
  const dayCount = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  const days = Array.from({ length: dayCount }, (_, index) => {
    const key = `${monthKey}-${String(index + 1).padStart(2, "0")}`;
    const status = recordMap.get(key);
    return { key, hasWorkday: Boolean(status), completed: status === "completed", selected: key === view.workdayDate.toISOString().slice(0, 10), today: key === todayKey };
  });
  const done = view.items.filter(item => item.status === "completed");
  const open = view.items.filter(item => item.status === "planned");
  const isToday = view.workdayDate.toISOString().slice(0, 10) === todayKey;
  const actionable = isToday && view.status === "active";
  const planning = isToday && view.status === "planning";
  const statusLabel = view.status === "completed" ? (locale === "ko" ? "기록" : "History") : view.status === "active" ? (locale === "ko" ? "진행 중" : "Active") : (locale === "ko" ? "준비 중" : "Planning");

  return <main className="shell">
    <AppNav />
    <header className="pageHeader"><div><p className="eyebrow">{formatWorkdayDate(view.workdayDate, locale)} {locale === "ko" ? "작업일" : "WORKDAY"}</p><h1>{isToday ? (locale === "ko" ? "오늘의 작업일" : "Today’s workday") : (locale === "ko" ? "작업일 기록" : "Workday record")}</h1><p className="lede">{locale === "ko" ? "실행과 기록을 한 화면에서 확인하세요. 달력으로 다른 날짜의 작업일도 바로 볼 수 있습니다." : "Work and review in one place. Use the calendar to open any recorded workday."}</p></div><span className="status">{statusLabel}</span></header>

    <div className="workdayHub">
      <div className="workdayMain">
        <section className="summaryStats"><div><span>{locale === "ko" ? "총 집중" : "Total focus"}</span><strong>{formatDuration(view.totalSeconds, false, locale)}</strong></div><div><span>{locale === "ko" ? "집중 세션" : "Sessions"}</span><strong>{view.totalSessions}{locale === "ko" ? "회" : ""}</strong></div><div><span>{locale === "ko" ? "완료" : "Completed"}</span><strong>{done.length}</strong></div><div><span>{locale === "ko" ? "남은 작업" : "Open"}</span><strong>{open.length}</strong></div></section>
        <section className="panel taskPanel">
          <div className="sectionTitle"><h2>{locale === "ko" ? "작업 목록" : "Tasks"}</h2><Link className="quietLink" href={`/library${isToday ? "" : `?date=${todayKey}`}`}>{locale === "ko" ? "전체 목록에서 계획하기" : "Plan from library"} <span aria-hidden="true">→</span></Link></div>
          <div className="workList">{view.items.map(item => <article className={`workItem ${item.status === "completed" ? "done" : ""}`} key={item.id}>
            <div className="workItemBody"><div className="taskTitleLine"><h3>{item.title}</h3>{item.categoryTitle && <span className="itemCategory">{item.taskId && item.categoryTitle === "미분류" ? (locale === "ko" ? "받은편지함" : "Inbox") : item.categoryTitle}</span>}</div><p>{formatDuration(item.seconds, false, locale)} · {item.sessionCount} {locale === "ko" ? "회 집중" : "sessions"}</p>
              {!item.taskId && view.status !== "completed" && <form action={saveWorkdayItemToLibrary} className="promoteForm"><input type="hidden" name="itemId" value={item.id}/><button className="textButton accent">{locale === "ko" ? "반복 목록에 저장" : "Save to library"}</button><small>{locale === "ko" ? "받은편지함에 저장됩니다" : "Saves to Inbox"}</small></form>}
            </div>
            {actionable && <div className="actions">{item.status !== "completed" && <form action={startFocus}><input type="hidden" name="itemId" value={item.id}/><button className="button secondary">{locale === "ko" ? "집중 시작" : "Start focus"}</button></form>}<form action={toggleItemComplete}><input type="hidden" name="itemId" value={item.id}/><button className="button">{item.status === "completed" ? (locale === "ko" ? "완료 취소" : "Undo") : (locale === "ko" ? "완료" : "Complete")}</button></form></div>}
          </article>)}</div>
          {!view.items.length && <div className="emptyState"><p>{locale === "ko" ? "이 작업일에 아직 작업이 없습니다." : "There are no tasks in this workday yet."}</p><Link className="button secondary" href="/library">{locale === "ko" ? "전체 목록에서 작업 고르기" : "Choose tasks from library"}</Link></div>}
          {planning && view.items.length > 0 && <form action={startWorkday}><input type="hidden" name="workdayId" value={view.id}/><button className="button full">{locale === "ko" ? "작업일 시작" : "Start workday"}</button></form>}
        </section>
      </div>
      <aside className="hubSidebar"><WorkdayCalendar monthKey={monthKey} days={days} locale={locale}/>{!isToday && <Link className="button secondary fullWidth" href="/">{locale === "ko" ? "오늘로 돌아가기" : "Back to today"}</Link>}<div className="calendarLegend"><span><i className="todayDot"/> {locale === "ko" ? "오늘" : "Today"}</span><span><i className="recordDot"/> {locale === "ko" ? "기록 있음" : "Recorded"}</span></div></aside>
    </div>
  </main>;
}
