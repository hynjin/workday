import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { WorkdayCalendar } from "@/components/workday-calendar";
import { WorkdayTaskList } from "@/components/workday-task-list";
import { getOrCreateCurrentWorkday, getWorkdayView } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { dateKeyToDate, formatDuration, formatWorkdayDate, getWorkdayDate } from "@/lib/workday-date";
import { ownedWorkdayWhere } from "@/lib/auth";

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
    : await prisma.workday.findUnique({ where: await ownedWorkdayWhere(dateKeyToDate(selectedKey)) });
  const view = selected ? await getWorkdayView(selected.id) : {
    id: "",
    workdayDate: dateKeyToDate(selectedKey),
    status: (selectedKey < todayKey ? "completed" : "planning") as "completed" | "planning",
    items: [],
    totalSeconds: 0,
    totalSessions: 0,
  };
  const activeSession = await prisma.focusSession.findFirst({ where: { endedAt: null }, select: { id: true } });
  if (activeSession && selectedKey === todayKey) return <main className="shell centered"><p className="eyebrow">{locale === "ko" ? "진행 중인 세션" : "ACTIVE SESSION"}</p><h1>{locale === "ko" ? "집중을 이어가세요" : "Keep your focus going"}</h1><Link className="button" href={`/focus/${activeSession.id}`}>{locale === "ko" ? "타이머로 돌아가기" : "Return to timer"}</Link></main>;

  const monthKey = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : selectedKey.slice(0, 7);
  const monthStart = dateKeyToDate(`${monthKey}-01`);
  const monthEnd = new Date(monthStart); monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const records = await prisma.workday.findMany({
    where: {
      workdayDate: { gte: monthStart, lt: monthEnd },
      OR: [
        { items: { some: { status: "completed" } } },
        { items: { some: { focusSessions: { some: { durationSeconds: { gt: 0 } } } } } },
      ],
    },
    select: { workdayDate: true },
  });
  const recordedDates = new Set(records.map(day => day.workdayDate.toISOString().slice(0, 10)));
  const dayCount = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  const days = Array.from({ length: dayCount }, (_, index) => {
    const key = `${monthKey}-${String(index + 1).padStart(2, "0")}`;
    return { key, hasWorkday: recordedDates.has(key), selected: key === selectedKey, today: key === todayKey };
  });
  const done = view.items.filter(item => item.status === "completed");
  const isToday = selectedKey === todayKey;
  const isPast = selectedKey < todayKey;
  const isFuture = selectedKey > todayKey;
  const actionable = isToday && view.status !== "completed";
  const planning = isFuture && view.status !== "completed";
  const statusLabel = view.status === "completed" ? (locale === "ko" ? "기록" : "History") : view.status === "active" ? (locale === "ko" ? "진행 중" : "Active") : (locale === "ko" ? "준비 중" : "Planning");

  return <main className="shell">
    <AppNav />
    <header className="pageHeader"><div><p className="eyebrow">{formatWorkdayDate(view.workdayDate, locale)} {locale === "ko" ? "작업일" : "WORKDAY"}</p><h1>{isToday ? (locale === "ko" ? "오늘의 작업일" : "Today’s workday") : isPast ? (locale === "ko" ? "작업일 기록" : "Workday record") : (locale === "ko" ? "작업일 계획" : "Workday plan")}</h1><p className="lede">{locale === "ko" ? "과거 기록, 오늘 실행, 미래 계획을 달력에서 한 흐름으로 확인하세요." : "Use one calendar for past records, today’s execution, and future plans."}</p></div><span className="status">{statusLabel}</span></header>

    <div className="workdayHub">
      <div className="workdayMain">
        <section className="summaryStats three"><div><span>{locale === "ko" ? "총 집중" : "Total focus"}</span><strong>{formatDuration(view.totalSeconds, false, locale)}</strong></div><div><span>{locale === "ko" ? "집중 세션" : "Sessions"}</span><strong>{view.totalSessions}{locale === "ko" ? "회" : ""}</strong></div><div><span>{locale === "ko" ? "완료" : "Completed"}</span><strong>{done.length}</strong></div></section>
        <section className="panel taskPanel">
          <div className="sectionTitle"><h2>{locale === "ko" ? "이 날짜의 작업" : "Scheduled tasks"}</h2><Link className="quietLink" href="/tasks">{locale === "ko" ? "작업에서 계획하기" : "Plan from Tasks"} <span aria-hidden="true">→</span></Link></div>
          <WorkdayTaskList items={view.items} locale={locale} actionable={actionable} planning={planning} historical={isPast} selectedDate={selectedKey}/>
          {!view.items.length && <div className="emptyState"><p>{isPast ? (locale === "ko" ? "이 날짜에는 기록된 작업이 없습니다." : "No work was recorded on this date.") : isFuture ? (locale === "ko" ? "이 날짜에는 아직 계획된 작업이 없습니다." : "Nothing is planned for this date yet.") : (locale === "ko" ? "오늘 작업이 아직 없습니다." : "There are no tasks for today yet.")}</p><Link className="button secondary" href="/tasks">{locale === "ko" ? "작업 계획하기" : "Plan tasks"}</Link></div>}
        </section>
      </div>
      <aside className="hubSidebar"><WorkdayCalendar monthKey={monthKey} days={days} locale={locale}/>{!isToday && <Link className="button secondary fullWidth" href="/">{locale === "ko" ? "오늘로 돌아가기" : "Back to today"}</Link>}<div className="calendarLegend"><span><i className="todayDot"/> {locale === "ko" ? "오늘" : "Today"}</span><span><i className="recordDot"/> {locale === "ko" ? "기록 있음" : "Recorded"}</span></div></aside>
    </div>
  </main>;
}
