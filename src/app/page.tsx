import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { WorkdayCalendar } from "@/components/workday-calendar";
import { WorkdayTaskList } from "@/components/workday-task-list";
import { getOrCreateCurrentWorkday, getWorkdayView } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { dateKeyToDate, formatDuration, formatWorkdayDate, getWorkdayDate } from "@/lib/workday-date";
import { ownedWorkdayWhere } from "@/lib/auth";
import { undoRemoveWorkdayItem } from "@/lib/actions";
import { OpenQuickAddButton } from "@/components/open-quick-add-button";

export const dynamic = "force-dynamic";

function validDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ date?: string; month?: string; removed?: string }> }) {
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
  if (activeSession && selectedKey === todayKey) return <main className="wd-app"><AppNav/><section className="wd-main wd-centered"><span className="wd-eyebrow">{locale === "ko" ? "진행 중인 세션" : "ACTIVE SESSION"}</span><h1>{locale === "ko" ? "집중을 이어가세요" : "Keep your focus going"}</h1><Link className="wd-button is-primary" href={`/focus/${activeSession.id}`}>{locale === "ko" ? "타이머로 돌아가기" : "Return to timer"}</Link></section></main>;

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
  const [taskProjects, taskAreas] = await Promise.all([
    prisma.project.findMany({ where:{ status:"active" }, orderBy:{ title:"asc" }, select:{ id:true,title:true,color:true } }),
    prisma.area.findMany({ where:{ status:"active" }, orderBy:{ title:"asc" }, select:{ id:true,title:true,color:true } }),
  ]);
  return <main className="wd-app">
    <AppNav />
    <section className="wd-main">
      <header className="wd-page-head"><div><span className="wd-eyebrow">{formatWorkdayDate(view.workdayDate, locale)}</span><h1>{isToday ? (locale === "ko" ? "오늘의 일정" : "Today’s schedule") : isPast ? (locale === "ko" ? "일정 기록" : "Schedule record") : (locale === "ko" ? "일정 계획" : "Schedule plan")}</h1><span className="wd-muted">{locale === "ko" ? "작업을 누르면 바로 집중을 시작해요." : "Select a task to start focusing."}</span></div><OpenQuickAddButton label={locale === "ko" ? "새 작업" : "New task"}/></header>

      <div className="wd-schedule-layout">
        <div className="wd-schedule-main">
        {params.removed && <aside className="wd-notice" role="status"><span>{locale === "ko" ? "이 날짜의 작업에서 제거했습니다. 작업 자체와 기록은 유지됩니다." : "Removed from this date. The task and its history are preserved."}</span><form action={undoRemoveWorkdayItem}><input type="hidden" name="itemId" value={params.removed}/><button className="wd-text-button">{locale === "ko" ? "실행 취소" : "Undo"}</button></form></aside>}
        <section className="wd-day-summary"><div><strong>{locale === "ko" ? "오늘의 흐름" : "Today’s flow"}</strong><span>{locale === "ko" ? `${view.items.length}개 중 ${done.length}개 완료 · 총 집중 ${formatDuration(view.totalSeconds, false, locale)}` : `${done.length} of ${view.items.length} complete · ${formatDuration(view.totalSeconds, false, locale)} focused`}</span></div><div className="wd-day-progress"><i style={{ width: `${view.items.length ? Math.round(done.length / view.items.length * 100) : 0}%` }}/></div></section>
        <section className="wd-task-section">
          <div className="wd-section-head"><h2>{locale === "ko" ? "이 날짜의 작업" : "Scheduled tasks"}</h2></div>
          <WorkdayTaskList items={view.items} locale={locale} actionable={actionable} planning={planning} selectedDate={selectedKey} projects={taskProjects} areas={taskAreas}/>
          {!view.items.length && <div className="wd-empty"><p>{isPast ? (locale === "ko" ? "이 날짜에는 기록된 작업이 없습니다." : "No work was recorded on this date.") : isFuture ? (locale === "ko" ? "이 날짜에는 아직 계획된 작업이 없습니다." : "Nothing is planned for this date yet.") : (locale === "ko" ? "오늘 작업이 아직 없습니다." : "There are no tasks for today yet.")}</p><Link className="wd-button" href="/tasks">{locale === "ko" ? "작업 계획하기" : "Plan tasks"}</Link></div>}
        </section>
      </div>
      <aside className="wd-calendar-side"><WorkdayCalendar monthKey={monthKey} days={days} locale={locale}/>{!isToday && <Link className="wd-button" href="/">{locale === "ko" ? "오늘로 돌아가기" : "Back to today"}</Link>}<div className="wd-calendar-legend"><span><i className="is-today"/> {locale === "ko" ? "오늘" : "Today"}</span><span><i className="is-recorded"/> {locale === "ko" ? "기록 있음" : "Recorded"}</span></div></aside>
    </div>
    </section>
  </main>;
}
