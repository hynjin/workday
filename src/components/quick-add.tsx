import { quickAddTask } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { getWorkdayDate } from "@/lib/workday-date";

export function QuickAdd({ projects, locale }: { projects: { id: string; title: string }[]; locale: Locale }) {
  const today = getWorkdayDate();
  return <details className="quickAdd">
    <summary aria-label={locale === "ko" ? "빠른 작업 추가" : "Quick add"}>{locale === "ko" ? "빠른 추가" : "Quick add"}</summary>
    <form action={quickAddTask} className="quickAddForm">
      <div><strong>{locale === "ko" ? "새 작업" : "New task"}</strong><small>{locale === "ko" ? "어느 화면에서든 바로 수집하고 계획합니다." : "Capture and schedule from anywhere."}</small></div>
      <input name="title" placeholder={locale === "ko" ? "작업 이름" : "Task name"} aria-label={locale === "ko" ? "작업 이름" : "Task name"} maxLength={120} required autoComplete="off"/>
      <label className="quickEstimate"><span>{locale === "ko" ? "예상 시간(분)" : "Estimate (min)"}</span><input type="number" name="estimatedMinutes" min="1" max="1440" placeholder="—"/></label>
      <div className="quickAddOptions">
        <label><span>{locale === "ko" ? "위치" : "Location"}</span><select name="projectId" defaultValue=""><option value="">{locale === "ko" ? "받은편지함" : "Inbox"}</option>{projects.map(project => <option value={project.id} key={project.id}>{project.title}</option>)}</select></label>
        <label><span>{locale === "ko" ? "일정" : "Schedule"}</span><select name="destination" defaultValue="inbox"><option value="inbox">{locale === "ko" ? "일정 없음" : "No date"}</option><option value="today">{locale === "ko" ? "오늘" : "Today"}</option><option value="tomorrow">{locale === "ko" ? "내일" : "Tomorrow"}</option><option value="date">{locale === "ko" ? "날짜 선택" : "Choose date"}</option></select></label>
      </div>
      <label className="quickDate"><span>{locale === "ko" ? "날짜 선택 시" : "If choosing a date"}</span><input type="date" name="date" min={today} defaultValue={today}/></label>
      <button className="button full">{locale === "ko" ? "작업 추가" : "Add task"}</button>
    </form>
  </details>;
}
