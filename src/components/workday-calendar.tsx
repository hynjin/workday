import Link from "next/link";

type CalendarDay = { key: string; hasWorkday: boolean; completed: boolean; selected: boolean; today: boolean };

export function WorkdayCalendar({ monthKey, days, locale }: { monthKey: string; days: CalendarDay[]; locale: "ko" | "en" }) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = first.getUTCDay();
  const previous = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
  const weekdays = locale === "ko" ? ["일", "월", "화", "수", "목", "금", "토"] : ["S", "M", "T", "W", "T", "F", "S"];
  const label = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-CA", { timeZone: "UTC", year: "numeric", month: "long" }).format(first);
  return <section className="calendarCard" aria-label={locale === "ko" ? "작업일 달력" : "Workday calendar"}>
    <header><Link aria-label={locale === "ko" ? "이전 달" : "Previous month"} href={`/?month=${previous}`}>‹</Link><strong>{label}</strong><Link aria-label={locale === "ko" ? "다음 달" : "Next month"} href={`/?month=${next}`}>›</Link></header>
    <div className="calendarGrid">{weekdays.map((day, index) => <span className="weekday" key={`${day}-${index}`}>{day}</span>)}{Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`}/>)}
      {days.map(day => day.hasWorkday || day.today
        ? <Link className={[day.selected ? "selected" : "", day.today ? "today" : "", day.hasWorkday ? "recorded" : ""].join(" ")} href={`/?date=${day.key}&month=${monthKey}`} key={day.key}><span>{Number(day.key.slice(-2))}</span>{day.completed && <i/>}</Link>
        : <span className="emptyDayCell" key={day.key}>{Number(day.key.slice(-2))}</span>)}
    </div>
  </section>;
}
