import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { updateWeeklyFocusGoal } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKey, nextUtcDate, streaks, weekStart } from "@/lib/productivity";
import { dateKeyToDate, formatDuration, getWorkdayDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

function validWeek(value: string | undefined, current: Date) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return current;
  const selected = weekStart(dateKeyToDate(value));
  return selected > current ? current : selected;
}

export default async function GrowthPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const todayKey = getWorkdayDate();
  const today = dateKeyToDate(todayKey);
  const currentWeekStart = weekStart(today);
  const selectedWeekStart = validWeek(params.week, currentWeekStart);
  const selectedWeekEnd = nextUtcDate(selectedWeekStart, 7);
  const isCurrentWeek = dateKey(selectedWeekStart) === dateKey(currentWeekStart);

  const [legacyGoal, savedGoal, weekWorkdays, activeWorkdays] = await Promise.all([
    prisma.productivityGoal.upsert({ where: { id: "default" }, create: {}, update: {} }),
    prisma.weeklyFocusGoal.findFirst({ where: { userId: null, weekStart: selectedWeekStart } }),
    prisma.workday.findMany({
      where: { workdayDate: { gte: selectedWeekStart, lt: selectedWeekEnd } },
      include: { items: { include: { focusSessions: { where: { endedAt: { not: null } } } } } },
      orderBy: { workdayDate: "asc" },
    }),
    prisma.workday.findMany({
      where: {
        workdayDate: { lte: today },
        OR: [
          { startedAt: { not: null } },
          { items: { some: { status: "completed" } } },
          { items: { some: { focusSessions: { some: { endedAt: { not: null } } } } } },
        ],
      },
      select: { workdayDate: true },
      orderBy: { workdayDate: "asc" },
    }),
  ]);

  const streak = streaks(activeWorkdays.map(day => dateKey(day.workdayDate)), todayKey);
  const dayRows = Array.from({ length: 7 }, (_, index) => {
    const day = nextUtcDate(selectedWeekStart, index);
    const workday = weekWorkdays.find(value => dateKey(value.workdayDate) === dateKey(day));
    const items = workday?.items ?? [];
    return {
      key: dateKey(day),
      focusSeconds: items.reduce((total, item) => total + item.focusSessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0), 0),
      completed: items.filter(item => item.status === "completed").length,
      planned: items.length,
    };
  });
  const focusSeconds = dayRows.reduce((sum, day) => sum + day.focusSeconds, 0);
  const completed = dayRows.reduce((sum, day) => sum + day.completed, 0);
  const planned = dayRows.reduce((sum, day) => sum + day.planned, 0);
  const completionRate = planned ? Math.round(completed / planned * 100) : 0;
  const goalMinutes = savedGoal?.weeklyFocusMinutes ?? legacyGoal.weeklyFocusMinutes;
  const goalSeconds = goalMinutes * 60;
  const goalPercent = Math.min(100, Math.round(focusSeconds / goalSeconds * 100));
  const achieved = focusSeconds >= goalSeconds;
  const maxDayFocus = Math.max(...dayRows.map(day => day.focusSeconds), 1);
  const weekdays = locale === "ko" ? ["월", "화", "수", "목", "금", "토", "일"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const previous = dateKey(nextUtcDate(selectedWeekStart, -7));
  const next = dateKey(nextUtcDate(selectedWeekStart, 7));
  const rangeLabel = `${dateKey(selectedWeekStart)} – ${dateKey(nextUtcDate(selectedWeekStart, 6))}`;

  return <main className="shell">
    <AppNav />
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "꾸준함을 보는 기록" : "A RECORD OF CONSISTENCY"}</p><h1>{locale === "ko" ? "성장" : "Growth"}</h1><p className="lede">{locale === "ko" ? "주별 집중과 완료 흐름을 부담 없이 확인합니다." : "A calm week-by-week view of focus and completion."}</p></div></header>

    <nav className="weekNavigator" aria-label={locale === "ko" ? "주간 이동" : "Week navigation"}>
      <Link className="button secondary" href={`/growth?week=${previous}`}>{locale === "ko" ? "이전 주" : "Previous"}</Link>
      <strong>{rangeLabel}</strong>
      {isCurrentWeek ? <span className="button secondary disabled">{locale === "ko" ? "다음 주" : "Next"}</span> : <Link className="button secondary" href={`/growth?week=${next}`}>{locale === "ko" ? "다음 주" : "Next"}</Link>}
    </nav>

    <section className="growthMetrics">
      <article className="panel"><span>{locale === "ko" ? "선택한 주 집중" : "Focus this week"}</span><strong>{formatDuration(focusSeconds, false, locale)}</strong><small>{goalPercent}% {locale === "ko" ? "목표 달성" : "of goal"}</small></article>
      <article className="panel"><span>{locale === "ko" ? "완료율" : "Completion rate"}</span><strong>{completionRate}%</strong><small>{completed}/{planned} {locale === "ko" ? "계획 작업" : "planned tasks"}</small></article>
      <article className="panel"><span>{locale === "ko" ? "현재 연속" : "Current streak"}</span><strong>{streak.current}{locale === "ko" ? "일" : "d"}</strong><small>{locale === "ko" ? `개인 최고 ${streak.best}일` : `Personal best ${streak.best}d`}</small></article>
      <article className="panel"><span>{locale === "ko" ? "누적 활동일" : "Active days"}</span><strong>{streak.activeDays}{locale === "ko" ? "일" : "d"}</strong><small>{locale === "ko" ? "쉬어도 누적 기록은 유지됩니다" : "Your history stays when you rest"}</small></article>
    </section>

    <div className="growthGrid">
      <section className="panel weeklyTrend">
        <div className="sectionTitle"><h2>{locale === "ko" ? "주간 흐름" : "This week"}</h2><span>{completed} {locale === "ko" ? "개 완료" : "completed"}</span></div>
        <div className="trendChart" aria-label={locale === "ko" ? "요일별 집중 시간" : "Daily focus time"}>
          {dayRows.map((day, index) => <div className="trendDay" key={day.key}><div className="trendBarTrack"><i style={{ height: `${Math.max(day.focusSeconds ? 8 : 0, Math.round(day.focusSeconds / maxDayFocus * 100))}%` }}/></div><strong>{weekdays[index]}</strong><small>{day.focusSeconds ? formatDuration(day.focusSeconds, false, locale) : "—"}</small></div>)}
        </div>
      </section>

      <section className="panel goalCard">
        <div className="sectionTitle"><h2>{locale === "ko" ? "주간 집중 목표" : "Weekly focus goal"}</h2><span>{achieved ? (locale === "ko" ? "달성" : "Achieved") : `${goalPercent}%`}</span></div>
        <progress max={goalSeconds} value={Math.min(focusSeconds, goalSeconds)}/>
        <p>{formatDuration(focusSeconds, false, locale)} / {formatDuration(goalSeconds, false, locale)}</p>
        {isCurrentWeek ? <form action={updateWeeklyFocusGoal}><input type="hidden" name="weekStart" value={dateKey(currentWeekStart)}/><label><span>{locale === "ko" ? "목표 시간(분)" : "Goal in minutes"}</span><input name="weeklyFocusMinutes" type="number" min="30" max="10080" defaultValue={goalMinutes}/></label><button className="button secondary">{locale === "ko" ? "저장" : "Save"}</button></form> : <p className="goalHistoryNote">{savedGoal ? (locale === "ko" ? `이 주에 저장된 목표 · ${achieved ? "달성" : "미달성"}` : `Saved goal · ${achieved ? "achieved" : "not achieved"}`) : (locale === "ko" ? "이 주에는 저장된 목표 기록이 없습니다." : "No saved goal record for this week.")}</p>}
        {isCurrentWeek && <small className="goalHelp">{locale === "ko" ? "최소 30분입니다. 변경한 목표는 이 주의 기록으로 보존됩니다." : "Minimum 30 minutes. Changes are preserved with this week."}</small>}
      </section>
    </div>
  </main>;
}
