import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { updateWeeklyFocusGoal } from "@/lib/actions";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKey, nextUtcDate, weekStart } from "@/lib/productivity";
import { reportIdentityKey, resolveReportName } from "@/lib/report-names";
import { dateKeyToDate, formatDuration, getWorkdayDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

type Period = "week" | "month";
function monthStart(date: Date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)); }
function addMonths(date: Date, count: number) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1)); }
function weekStartsInRange(start: Date, end: Date) {
  const result: Date[] = [];
  for (let cursor = weekStart(start); cursor < end; cursor = nextUtcDate(cursor, 7)) result.push(cursor);
  return result;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; start?: string; day?: string; difference?: string }> }) {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  const today = dateKeyToDate(getWorkdayDate());
  const period: Period = params.period === "month" ? "month" : "week";
  const currentStart = period === "week" ? weekStart(today) : monthStart(today);
  const requested = params.start && /^\d{4}-\d{2}-\d{2}$/.test(params.start) ? dateKeyToDate(params.start) : currentStart;
  const selectedStart = requested > currentStart ? currentStart : period === "week" ? weekStart(requested) : monthStart(requested);
  const selectedEnd = period === "week" ? nextUtcDate(selectedStart, 7) : addMonths(selectedStart, 1);
  const previousStart = period === "week" ? nextUtcDate(selectedStart, -7) : addMonths(selectedStart, -1);
  const isCurrent = selectedStart.getTime() === currentStart.getTime();
  const canNext = selectedEnd <= currentStart;
  const rangeLabel = `${dateKey(selectedStart)} – ${dateKey(nextUtcDate(selectedEnd, -1))}`;
  const reportWeeks = weekStartsInRange(selectedStart, selectedEnd);
  const goalRangeStart = reportWeeks[0];
  const goalRangeEnd = nextUtcDate(reportWeeks.at(-1)!, 7);

  const [workdays, previousWorkdays, goalWorkdays, weeklyGoals] = await Promise.all([
    prisma.workday.findMany({
      where: { workdayDate: { gte: selectedStart, lt: selectedEnd } },
      include: { items: { where: { dismissedAt: null }, include: { task: { select: { id: true, title: true, estimatedMinutes: true } }, focusSessions: { where: { endedAt: { not: null } } } } } },
      orderBy: { workdayDate: "asc" },
    }),
    prisma.workday.findMany({
      where: { workdayDate: { gte: previousStart, lt: selectedStart } },
      include: { items: { include: { focusSessions: { where: { endedAt: { not: null } } } } } },
    }),
    prisma.workday.findMany({
      where: { workdayDate: { gte: goalRangeStart, lt: goalRangeEnd } },
      include: { items: { include: { focusSessions: { where: { endedAt: { not: null } } } } } },
    }),
    prisma.weeklyFocusGoal.findMany({
      where: { weekStart: { gte: goalRangeStart, lt: goalRangeEnd } },
      orderBy: { weekStart: "asc" },
    }),
  ]);

  const items = workdays.flatMap(day => day.items.map(item => ({ ...item, date: day.workdayDate })));
  const rawSessions = items.flatMap(item => item.focusSessions.map(session => ({ ...session, item })));
  const taskIds = [...new Set(rawSessions.flatMap(session => session.taskIdSnapshot ? [session.taskIdSnapshot] : []))];
  const projectIds = [...new Set(rawSessions.flatMap(session => session.projectIdSnapshot ? [session.projectIdSnapshot] : []))];
  const areaIds = [...new Set(rawSessions.flatMap(session => session.areaIdSnapshot ? [session.areaIdSnapshot] : []))];
  const [currentTasks, currentProjects, currentAreas] = await Promise.all([
    prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true } }),
    prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, title: true } }),
    prisma.area.findMany({ where: { id: { in: areaIds } }, select: { id: true, title: true, color: true } }),
  ]);
  const taskNames = new Map(currentTasks.map(row => [row.id, row.title]));
  const projectNames = new Map(currentProjects.map(row => [row.id, row.title]));
  const areaNames = new Map(currentAreas.map(row => [row.id, row.title]));
  const areaColors = new Map(currentAreas.map(row => [row.id, row.color]));
  const sessions = rawSessions.map(session => ({
    ...session,
    taskName: resolveReportName(session.taskIdSnapshot, session.taskTitleSnapshot, taskNames, session.item.titleSnapshot)!,
    projectName: resolveReportName(session.projectIdSnapshot, session.projectTitleSnapshot, projectNames),
    areaName: resolveReportName(session.areaIdSnapshot, session.areaTitleSnapshot, areaNames),
    areaColor: session.areaIdSnapshot ? areaColors.get(session.areaIdSnapshot) ?? "gray" : "gray",
  }));

  const previousSeconds = previousWorkdays.flatMap(day => day.items).flatMap(item => item.focusSessions).reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
  const focusSeconds = sessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
  const completedItems = items.filter(item => item.status === "completed");
  const openItems = items.filter(item => item.status !== "completed");
  const goalSeconds = items.reduce((sum, item) => sum + (item.dailyGoalMinutes ?? 0) * 60, 0);
  const activeDays = new Set(sessions.map(session => dateKey(session.item.date))).size;
  const change = previousSeconds ? Math.round((focusSeconds - previousSeconds) / previousSeconds * 100) : focusSeconds ? 100 : 0;
  const dayCount = Math.round((selectedEnd.getTime() - selectedStart.getTime()) / 86_400_000);
  const dayRows = Array.from({ length: dayCount }, (_, index) => {
    const day = nextUtcDate(selectedStart, index), key = dateKey(day);
    const daySessions = sessions.filter(session => dateKey(session.item.date) === key);
    return { key, seconds: daySessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0), sessions: daySessions };
  });
  const maxDay = Math.max(...dayRows.map(day => day.seconds), 1);
  const selectedDayKey = params.day && dayRows.some(day => day.key === params.day) ? params.day : dayRows.find(day => day.seconds > 0)?.key ?? dayRows[0].key;
  const selectedDay = dayRows.find(day => day.key === selectedDayKey)!;
  const selectedDayTasks = new Map<string, { seconds: number; area: string; project: string }>();
  selectedDay.sessions.forEach(session => {
    const key = session.taskIdSnapshot ?? session.taskName;
    const current = selectedDayTasks.get(key) ?? { seconds: 0, area: session.areaName ?? "—", project: session.projectName ?? "—" };
    current.seconds += session.durationSeconds ?? 0;
    selectedDayTasks.set(key, current);
  });
  const grouped = (kind: "area" | "project", empty: string) => {
    const values = new Map<string, { name: string; seconds: number }>();
    sessions.forEach(session => {
      const id = kind === "area" ? session.areaIdSnapshot : session.projectIdSnapshot;
      const name = kind === "area" ? session.areaName : session.projectName;
      const key = reportIdentityKey(id, name, empty);
      const current = values.get(key) ?? { name: name ?? empty, seconds: 0 };
      current.seconds += session.durationSeconds ?? 0;
      values.set(key, current);
    });
    return [...values.values()].sort((a, b) => b.seconds - a.seconds);
  };
  const taskTotals = new Map<string, { name: string; goal: number; focused: number }>();
  items.forEach(item => {
    const key = item.taskId ?? item.titleSnapshot;
    const current = taskTotals.get(key) ?? { name: item.task?.title ?? item.titleSnapshot, goal: 0, focused: 0 };
    current.goal += (item.dailyGoalMinutes ?? 0) * 60;
    current.focused += item.focusSessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
    taskTotals.set(key, current);
  });
  const areas = grouped("area", locale === "ko" ? "Area 없음" : "No Area");
  const projects = grouped("project", locale === "ko" ? "프로젝트 없음" : "No Project");
  const differenceAscending = params.difference === "small";
  const taskDifferenceRows = [...taskTotals.values()].sort((a,b) => {
    const left = Math.abs(a.goal - a.focused), right = Math.abs(b.goal - b.focused);
    return differenceAscending ? left - right : right - left;
  });
  const hrefFor = (day?: string) => `/growth?period=${period}&start=${dateKey(selectedStart)}${day ? `&day=${day}` : ""}`;
  const goalByWeek = new Map(weeklyGoals.map(goal => [dateKey(goal.weekStart), goal]));
  const weeklyResults = reportWeeks.map(start => {
    const end = nextUtcDate(start, 7);
    const actualSeconds = goalWorkdays.filter(day => day.workdayDate >= start && day.workdayDate < end)
      .flatMap(day => day.items).flatMap(item => item.focusSessions)
      .reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
    return { start, goal: goalByWeek.get(dateKey(start)), actualSeconds };
  });
  const selectedGoal = period === "week" ? weeklyResults[0] : null;
  const goalMinutes = selectedGoal?.goal?.weeklyFocusMinutes ?? 300;
  const goalProgress = selectedGoal ? Math.min(100, Math.round(selectedGoal.actualSeconds / (goalMinutes * 60) * 100)) : 0;
  const periodGoalSeconds = period === "week"
    ? goalMinutes * 60
    : weeklyResults.reduce((sum, row) => sum + (row.goal?.weeklyFocusMinutes ?? 0) * 60, 0);
  const plannedSeconds = items.reduce((sum, item) => sum + (item.task?.estimatedMinutes ?? item.dailyGoalMinutes ?? 0) * 60, 0);

  return <main className="shell"><AppNav/>
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "실행 기록" : "EXECUTION HISTORY"}</p><h1>{locale === "ko" ? "리포트" : "Reports"}</h1><p className="lede">{locale === "ko" ? "주간 집중 목표와 작업별 목표 시간을 구분해 확인합니다." : "Review your weekly focus goal separately from each task’s Goal Time."}</p></div></header>
    <div className="reportControls"><nav className="reportSegments"><Link className={period === "week" ? "active" : ""} href="/growth?period=week">{locale === "ko" ? "주간" : "Weekly"}</Link><Link className={period === "month" ? "active" : ""} href="/growth?period=month">{locale === "ko" ? "월간" : "Monthly"}</Link></nav><nav className="weekNavigator"><Link className="button secondary" href={`/growth?period=${period}&start=${dateKey(previousStart)}`}>{locale === "ko" ? "이전" : "Previous"}</Link><strong>{rangeLabel}</strong>{canNext ? <Link className="button secondary" href={`/growth?period=${period}&start=${dateKey(selectedEnd)}`}>{locale === "ko" ? "다음" : "Next"}</Link> : <span className="button secondary disabled">{locale === "ko" ? "다음" : "Next"}</span>}</nav></div>

    <section className="reportTimeSummary" aria-label={locale === "ko" ? "집중 시간 요약" : "Focus time summary"}>
      <article><span>{period === "week" ? (locale === "ko" ? "주간 집중 목표" : "Weekly focus goal") : (locale === "ko" ? "월간 목표 총합" : "Monthly goal total")}</span><strong>{formatDuration(periodGoalSeconds, false, locale)}</strong><small>{period === "week" ? `${goalProgress}%` : (locale === "ko" ? "주간 목표 합계" : "Sum of weekly goals")}</small></article>
      <article><span>{locale === "ko" ? "계획한 집중 시간" : "Planned focus"}</span><strong>{formatDuration(plannedSeconds, false, locale)}</strong><small>{locale === "ko" ? "작업별 예상 시간 합계" : "Task estimate total"}</small></article>
      <article><span>{locale === "ko" ? "실제 집중 시간" : "Actual focus"}</span><strong>{formatDuration(focusSeconds, false, locale)}</strong><small>{plannedSeconds ? `${Math.round(focusSeconds / plannedSeconds * 100)}%` : "—"}</small></article>
    </section>

    {period === "week" && selectedGoal && <section className="panel weeklyFocusGoal">
      <div><span>{locale === "ko" ? "주간 집중 목표" : "Weekly focus goal"}</span><strong>{Math.round(selectedGoal.actualSeconds / 60)} / {goalMinutes}{locale === "ko" ? "분" : " min"}</strong><small>{goalProgress}% · {locale === "ko" ? `남은 시간 ${Math.max(0, goalMinutes - Math.round(selectedGoal.actualSeconds / 60))}분` : `${Math.max(0, goalMinutes - Math.round(selectedGoal.actualSeconds / 60))} min remaining`}</small></div>
      <progress max="100" value={goalProgress}/>
      {isCurrent ? <form action={updateWeeklyFocusGoal}><input type="hidden" name="weekStart" value={dateKey(selectedStart)}/><label><span>{locale === "ko" ? "이번 주 전체 목표 (최소 30분)" : "Whole-week target (min. 30 min)"}</span><input name="weeklyFocusMinutes" type="number" min="30" max="10080" defaultValue={goalMinutes}/></label><button className="button secondary">{locale === "ko" ? "목표 수정" : "Update goal"}</button></form> : <p>{locale === "ko" ? "과거 주의 목표는 기록으로 보존됩니다." : "Past goals are preserved as history."}</p>}
    </section>}
    {period === "month" && <section className="panel monthlyWeeklyGoals"><div className="sectionTitle"><h2>{locale === "ko" ? "주별 집중 목표" : "Weekly focus goals"}</h2><span>{locale === "ko" ? "월간 목표로 합산하지 않습니다." : "Not combined into a monthly target."}</span></div>{weeklyResults.map(row => <div key={dateKey(row.start)}><span>{dateKey(row.start)}</span><strong>{Math.round(row.actualSeconds / 60)} / {row.goal?.weeklyFocusMinutes ?? "—"}{locale === "ko" ? "분" : " min"}</strong></div>)}</section>}

    <section className="growthMetrics reportMetrics">
      <article className="panel"><span>{locale === "ko" ? "총 집중" : "Total focus"}</span><strong>{formatDuration(focusSeconds, false, locale)}</strong><small>{change >= 0 ? "+" : ""}{change}% {locale === "ko" ? "이전 기간 대비" : "vs previous"}</small></article>
      <article className="panel"><span>{locale === "ko" ? "완료 작업" : "Completed tasks"}</span><strong>{completedItems.length}</strong></article>
      <article className="panel"><span>{locale === "ko" ? "활동일" : "Active days"}</span><strong>{activeDays}</strong></article>
      <article className="panel"><span>{locale === "ko" ? "집중 세션" : "Focus sessions"}</span><strong>{sessions.length}</strong></article>
      <article className="panel taskGoalMetric"><span>{locale === "ko" ? "작업 Goal Time 대비 실행" : "Actual vs task Goal Time"}</span><strong>{goalSeconds ? `${Math.round(focusSeconds / goalSeconds * 100)}%` : "—"}</strong><small>{formatDuration(focusSeconds, false, locale)} / {formatDuration(goalSeconds, false, locale)}</small></article>
    </section>
    <section className="panel weeklyTrend reportTrend"><div className="sectionTitle"><h2>{period === "week" ? (locale === "ko" ? "날짜별 집중 흐름" : "Focus flow by date") : (locale === "ko" ? "월간 집중 기록" : "Monthly focus record")}</h2><span>{period === "week" ? (locale === "ko" ? "영역별 누적" : "Stacked by Area") : (locale === "ko" ? "기록된 날짜를 선택하세요" : "Select a recorded date")}</span></div><div className={`trendChart ${period === "month" ? "monthly" : ""}`}>{dayRows.map((day,index) => {
      const segments = new Map<string, number>();
      day.sessions.forEach(session => segments.set(session.areaColor, (segments.get(session.areaColor) ?? 0) + (session.durationSeconds ?? 0)));
      return <Link className={`trendDay ${day.seconds ? "recorded" : ""} ${day.key === selectedDayKey ? "selected" : ""}`} style={period === "month" && index === 0 ? { gridColumnStart: dateKeyToDate(day.key).getUTCDay() + 1 } : undefined} href={hrefFor(day.key)} key={day.key}><div className="trendBarTrack"><div className="trendStack" style={{ height: `${Math.max(day.seconds ? 6 : 0, Math.round(day.seconds / maxDay * 100))}%` }}>{[...segments.entries()].map(([color,seconds]) => <i className={`trendSegment ${color}`} style={{ height: `${day.seconds ? seconds / day.seconds * 100 : 0}%` }} key={color}/>)}</div></div><strong>{period === "week" ? new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-CA",{weekday:"short",timeZone:"UTC"}).format(dateKeyToDate(day.key)) : Number(day.key.slice(-2))}</strong><small>{day.seconds ? formatDuration(day.seconds, false, locale) : "0"}</small></Link>;
    })}</div>
      <div className="dayDrilldown"><h3>{new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-CA", { month: "long", day: "numeric", timeZone: "UTC" }).format(dateKeyToDate(selectedDayKey))} · {formatDuration(selectedDay.seconds, false, locale)}</h3>{[...selectedDayTasks.entries()].map(([key, detail]) => <div key={key}><span><strong>{sessions.find(session => (session.taskIdSnapshot ?? session.taskName) === key)?.taskName ?? key}</strong><small>{detail.area} · {detail.project}</small></span><b>{formatDuration(detail.seconds, false, locale)}</b></div>)}{!selectedDayTasks.size && <p className="columnEmpty">{locale === "ko" ? "집중 기록이 없습니다." : "No focus recorded."}</p>}</div>
    </section>
    <div className="reportBreakdowns">{[[locale === "ko" ? "Area별" : "By Area", areas], [locale === "ko" ? "Project별" : "By Project", projects]].map(([title, rows]) => <section className="panel reportRanking" key={title as string}><h2>{title as string}</h2>{(rows as { name: string; seconds: number }[]).slice(0, 8).map(row => <div key={row.name}><span>{row.name}</span><strong>{formatDuration(row.seconds, false, locale)}</strong></div>)}{!(rows as unknown[]).length && <p className="columnEmpty">{locale === "ko" ? "집중 기록이 없습니다." : "No focus records."}</p>}</section>)}
      <section className="panel reportRanking taskGoalBreakdown"><div className="reportRankingHead"><h2>{locale === "ko" ? "작업별 계획 · 실제 집중" : "Task plan · actual focus"}</h2><span>{differenceAscending ? (locale === "ko" ? "차이 작은 순" : "Smallest difference") : (locale === "ko" ? "차이 큰 순" : "Largest difference")} <Link aria-label={locale === "ko" ? "정렬 순서 전환" : "Toggle sort order"} href={`${hrefFor(selectedDayKey)}&difference=${differenceAscending ? "large" : "small"}`}>{differenceAscending ? "⇣" : "⇩"}</Link></span></div>{taskDifferenceRows.map(value => <div key={value.name}><span>{value.name}</span><strong>{formatDuration(value.goal, false, locale)} · {formatDuration(value.focused, false, locale)}</strong></div>)}</section>
    </div>
    <div className="reportTaskColumns"><section className="panel completedReport"><h2>{locale === "ko" ? "완료한 작업" : "Completed tasks"}</h2>{completedItems.map(item => <div key={item.id}><span>{item.task?.title ?? item.titleSnapshot}</span><time>{dateKey(item.date)}</time></div>)}{!completedItems.length && <p className="columnEmpty">{locale === "ko" ? "완료 기록이 없습니다." : "No completed tasks."}</p>}</section>
      <section className="panel completedReport"><h2>{isCurrent ? (locale === "ko" ? "남은 작업" : "Remaining tasks") : (locale === "ko" ? "미완료 작업" : "Not completed")}</h2>{openItems.map(item => <div key={item.id}><span>{item.task?.title ?? item.titleSnapshot}</span><time>{dateKey(item.date)}</time></div>)}{!openItems.length && <p className="columnEmpty">{locale === "ko" ? "해당 작업이 없습니다." : "No tasks in this group."}</p>}</section></div>
  </main>;
}
