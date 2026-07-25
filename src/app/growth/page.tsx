import { AppNav } from "@/components/app-nav";
import { updateWeeklyFocusGoal } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKey, nextUtcDate, streaks, weekStart } from "@/lib/productivity";
import { dateKeyToDate, formatDuration, getWorkdayDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

export default async function GrowthPage() {
  const locale = await getLocale();
  const todayKey = getWorkdayDate();
  const today = dateKeyToDate(todayKey);
  const currentWeekStart = weekStart(today);
  const visibleEnd = nextUtcDate(today, 1);

  const [goal, weekWorkdays, activeWorkdays] = await Promise.all([
    prisma.productivityGoal.upsert({ where: { id: "default" }, create: {}, update: {} }),
    prisma.workday.findMany({
      where: { workdayDate: { gte: currentWeekStart, lt: visibleEnd } },
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
    const day = nextUtcDate(currentWeekStart, index);
    const workday = weekWorkdays.find(value => dateKey(value.workdayDate) === dateKey(day));
    const items = workday?.items ?? [];
    const focusSeconds = items.reduce((total, item) => total + item.focusSessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0), 0);
    return {
      key: dateKey(day),
      focusSeconds,
      completed: items.filter(item => item.status === "completed").length,
      planned: items.length,
    };
  });
  const focusSeconds = dayRows.reduce((sum, day) => sum + day.focusSeconds, 0);
  const completed = dayRows.reduce((sum, day) => sum + day.completed, 0);
  const planned = dayRows.reduce((sum, day) => sum + day.planned, 0);
  const completionRate = planned ? Math.round(completed / planned * 100) : 0;
  const goalSeconds = goal.weeklyFocusMinutes * 60;
  const goalPercent = Math.min(100, Math.round(focusSeconds / goalSeconds * 100));
  const maxDayFocus = Math.max(...dayRows.map(day => day.focusSeconds), 1);
  const weekdays = locale === "ko" ? ["월", "화", "수", "목", "금", "토", "일"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return <main className="shell">
    <AppNav />
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "꾸준함을 보는 기록" : "A RECORD OF CONSISTENCY"}</p><h1>{locale === "ko" ? "성장" : "Growth"}</h1><p className="lede">{locale === "ko" ? "이번 주의 집중과 완료 흐름을 부담 없이 확인합니다." : "A calm view of this week’s focus and completion."}</p></div></header>

    <section className="growthMetrics">
      <article className="panel"><span>{locale === "ko" ? "이번 주 집중" : "Focus this week"}</span><strong>{formatDuration(focusSeconds, false, locale)}</strong><small>{goalPercent}% {locale === "ko" ? "목표 달성" : "of goal"}</small></article>
      <article className="panel"><span>{locale === "ko" ? "완료율" : "Completion rate"}</span><strong>{completionRate}%</strong><small>{completed}/{planned} {locale === "ko" ? "계획 작업" : "planned tasks"}</small></article>
      <article className="panel"><span>{locale === "ko" ? "현재 연속" : "Current streak"}</span><strong>{streak.current}{locale === "ko" ? "일" : "d"}</strong><small>{locale === "ko" ? `개인 최고 ${streak.best}일` : `Personal best ${streak.best}d`}</small></article>
      <article className="panel"><span>{locale === "ko" ? "누적 활동일" : "Active days"}</span><strong>{streak.activeDays}{locale === "ko" ? "일" : "d"}</strong><small>{locale === "ko" ? "쉬어도 누적 기록은 유지됩니다" : "Your history stays even when you rest"}</small></article>
    </section>

    <div className="growthGrid">
      <section className="panel weeklyTrend">
        <div className="sectionTitle"><h2>{locale === "ko" ? "이번 주 흐름" : "This week"}</h2><span>{completed} {locale === "ko" ? "개 완료" : "completed"}</span></div>
        <div className="trendChart" aria-label={locale === "ko" ? "요일별 집중 시간" : "Daily focus time"}>
          {dayRows.map((day, index) => <div className="trendDay" key={day.key}><div className="trendBarTrack"><i style={{ height: `${Math.max(day.focusSeconds ? 8 : 0, Math.round(day.focusSeconds / maxDayFocus * 100))}%` }}/></div><strong>{weekdays[index]}</strong><small>{day.focusSeconds ? formatDuration(day.focusSeconds, false, locale) : "—"}</small></div>)}
        </div>
      </section>

      <section className="panel goalCard">
        <div className="sectionTitle"><h2>{locale === "ko" ? "주간 집중 목표" : "Weekly focus goal"}</h2><span>{goalPercent}%</span></div>
        <progress max={goalSeconds} value={Math.min(focusSeconds, goalSeconds)}/>
        <p>{formatDuration(focusSeconds, false, locale)} / {formatDuration(goalSeconds, false, locale)}</p>
        <form action={updateWeeklyFocusGoal}><label><span>{locale === "ko" ? "목표 시간(분)" : "Goal in minutes"}</span><input name="weeklyFocusMinutes" type="number" min="30" max="10080" defaultValue={goal.weeklyFocusMinutes}/></label><button className="button secondary">{locale === "ko" ? "목표 저장" : "Save goal"}</button></form>
      </section>
    </div>

  </main>;
}
