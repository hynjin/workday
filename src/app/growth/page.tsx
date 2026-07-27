import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKey, nextUtcDate, weekStart } from "@/lib/productivity";
import { dateKeyToDate, formatDuration, getWorkdayDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

type Period = "week" | "month";
function monthStart(date: Date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)); }
function addMonths(date: Date, count: number) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1)); }

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; start?: string }> }) {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const today = dateKeyToDate(getWorkdayDate());
  const period: Period = params.period === "month" ? "month" : "week";
  const currentStart = period === "week" ? weekStart(today) : monthStart(today);
  const requested = params.start && /^\d{4}-\d{2}-\d{2}$/.test(params.start) ? dateKeyToDate(params.start) : currentStart;
  const selectedStart = requested > currentStart ? currentStart : period === "week" ? weekStart(requested) : monthStart(requested);
  const selectedEnd = period === "week" ? nextUtcDate(selectedStart, 7) : addMonths(selectedStart, 1);
  const previousStart = period === "week" ? nextUtcDate(selectedStart, -7) : addMonths(selectedStart, -1);
  const nextStart = selectedEnd;
  const canNext = nextStart <= currentStart;

  const [workdays, previousWorkdays] = await Promise.all([
    prisma.workday.findMany({
      where: { workdayDate: { gte: selectedStart, lt: selectedEnd } },
      include: { items: { include: { focusSessions: { where: { endedAt: { not: null } } } } } },
      orderBy: { workdayDate: "asc" },
    }),
    prisma.workday.findMany({
      where: { workdayDate: { gte: previousStart, lt: selectedStart } },
      include: { items: { include: { focusSessions: { where: { endedAt: { not: null } } } } } },
    }),
  ]);
  const items = workdays.flatMap(day => day.items.map(item => ({ ...item, date: day.workdayDate })));
  const sessions = items.flatMap(item => item.focusSessions.map(session => ({ ...session, item })));
  const previousSeconds = previousWorkdays.flatMap(day => day.items).flatMap(item => item.focusSessions).reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
  const focusSeconds = sessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
  const completedItems = items.filter(item => item.status === "completed");
  const goalSeconds = items.reduce((sum, item) => sum + (item.dailyGoalMinutes ?? 0) * 60, 0);
  const activeDays = new Set(sessions.map(session => dateKey(session.item.date))).size;
  const change = previousSeconds ? Math.round((focusSeconds - previousSeconds) / previousSeconds * 100) : focusSeconds ? 100 : 0;
  const dayCount = Math.round((selectedEnd.getTime() - selectedStart.getTime()) / 86_400_000);
  const dayRows = Array.from({ length: dayCount }, (_, index) => {
    const day = nextUtcDate(selectedStart, index);
    return { key: dateKey(day), seconds: sessions.filter(session => dateKey(session.item.date) === dateKey(day)).reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0) };
  });
  const maxDay = Math.max(...dayRows.map(day => day.seconds), 1);
  const group = (field: "areaTitleSnapshot" | "projectTitleSnapshot" | "taskTitleSnapshot", empty: string) => {
    const values = new Map<string, number>();
    sessions.forEach(session => values.set(session[field] ?? empty, (values.get(session[field] ?? empty) ?? 0) + (session.durationSeconds ?? 0)));
    return [...values.entries()].sort((a, b) => b[1] - a[1]);
  };
  const areas = group("areaTitleSnapshot", locale === "ko" ? "Area 없음" : "No Area");
  const projects = group("projectTitleSnapshot", locale === "ko" ? "프로젝트 없음" : "No Project");
  const tasks = group("taskTitleSnapshot", locale === "ko" ? "하루 작업" : "One-off");
  const rangeLabel = `${dateKey(selectedStart)} – ${dateKey(nextUtcDate(selectedEnd, -1))}`;

  return <main className="shell"><AppNav/>
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "실행 기록" : "EXECUTION HISTORY"}</p><h1>{locale === "ko" ? "리포트" : "Reports"}</h1><p className="lede">{locale === "ko" ? "집중 시간이 어디에 쓰였는지 주간·월간으로 확인합니다." : "See where your focused time went, week by week or month by month."}</p></div></header>
    <div className="reportControls"><nav className="viewSwitch"><Link className={period === "week" ? "active" : ""} href={`/growth?period=week`}>{locale === "ko" ? "주간" : "Weekly"}</Link><Link className={period === "month" ? "active" : ""} href={`/growth?period=month`}>{locale === "ko" ? "월간" : "Monthly"}</Link></nav><nav className="weekNavigator"><Link className="button secondary" href={`/growth?period=${period}&start=${dateKey(previousStart)}`}>{locale === "ko" ? "이전" : "Previous"}</Link><strong>{rangeLabel}</strong>{canNext ? <Link className="button secondary" href={`/growth?period=${period}&start=${dateKey(nextStart)}`}>{locale === "ko" ? "다음" : "Next"}</Link> : <span className="button secondary disabled">{locale === "ko" ? "다음" : "Next"}</span>}</nav></div>
    <section className="growthMetrics reportMetrics">
      <article className="panel"><span>{locale === "ko" ? "총 집중" : "Total focus"}</span><strong>{formatDuration(focusSeconds, false, locale)}</strong><small>{change >= 0 ? "+" : ""}{change}% {locale === "ko" ? "이전 기간 대비" : "vs previous"}</small></article>
      <article className="panel"><span>{locale === "ko" ? "완료 작업" : "Completed tasks"}</span><strong>{completedItems.length}</strong></article>
      <article className="panel"><span>{locale === "ko" ? "활동일" : "Active days"}</span><strong>{activeDays}</strong></article>
      <article className="panel"><span>{locale === "ko" ? "집중 세션" : "Focus sessions"}</span><strong>{sessions.length}</strong><small>{locale === "ko" ? "평균 " : "Average "}{formatDuration(sessions.length ? Math.round(focusSeconds / sessions.length) : 0, false, locale)}</small></article>
      <article className="panel"><span>{locale === "ko" ? "목표 대비 실행" : "Goal vs actual"}</span><strong>{goalSeconds ? `${Math.round(focusSeconds / goalSeconds * 100)}%` : "—"}</strong><small>{formatDuration(focusSeconds, false, locale)} / {formatDuration(goalSeconds, false, locale)}</small></article>
    </section>
    <section className="panel weeklyTrend reportTrend"><div className="sectionTitle"><h2>{locale === "ko" ? "날짜별 집중" : "Focus by day"}</h2></div><div className={`trendChart ${period === "month" ? "monthly" : ""}`}>{dayRows.map(day => <div className="trendDay" key={day.key}><div className="trendBarTrack"><i style={{ height: `${Math.max(day.seconds ? 6 : 0, Math.round(day.seconds / maxDay * 100))}%` }}/></div><strong>{Number(day.key.slice(-2))}</strong><small>{day.seconds ? formatDuration(day.seconds, false, locale) : "—"}</small></div>)}</div></section>
    <div className="reportBreakdowns">{[[locale === "ko" ? "Area별" : "By Area", areas], [locale === "ko" ? "Project별" : "By Project", projects], [locale === "ko" ? "Task별" : "By Task", tasks]].map(([title, rows]) => <section className="panel reportRanking" key={title as string}><h2>{title as string}</h2>{(rows as [string, number][]).slice(0, 8).map(([name, seconds]) => <div key={name}><span>{name}</span><strong>{formatDuration(seconds, false, locale)}</strong></div>)}{!(rows as [string, number][]).length && <p className="columnEmpty">{locale === "ko" ? "집중 기록이 없습니다." : "No focus records."}</p>}</section>)}</div>
    <section className="panel completedReport"><h2>{locale === "ko" ? "완료한 작업" : "Completed tasks"}</h2>{completedItems.map(item => <div key={item.id}><span>{item.titleSnapshot}</span><time>{dateKey(item.date)}</time></div>)}{!completedItems.length && <p className="columnEmpty">{locale === "ko" ? "완료 기록이 없습니다." : "No completed tasks."}</p>}</section>
  </main>;
}
