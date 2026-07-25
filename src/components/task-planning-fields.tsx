import { deleteRecurrenceRule, updateRecurrenceRule, updateTaskEstimate } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { getWorkdayDate } from "@/lib/workday-date";

type Rule = {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  weekdays: number[];
  monthDay: number | null;
  startsOn: Date;
  endsOn: Date | null;
};

export function TaskPlanningFields({ taskId, estimatedMinutes, rule, locale }: {
  taskId: string;
  estimatedMinutes: number | null;
  rule: Rule | null;
  locale: Locale;
}) {
  const today = getWorkdayDate();
  const weekdayLabels = locale === "ko" ? ["일", "월", "화", "수", "목", "금", "토"] : ["S", "M", "T", "W", "T", "F", "S"];
  return <details className="taskPlanning">
    <summary>{locale === "ko" ? "계획 설정" : "Planning settings"}</summary>
    <div className="taskPlanningBody">
      <form action={updateTaskEstimate} className="estimateForm">
        <input type="hidden" name="taskId" value={taskId}/>
        <label><span>{locale === "ko" ? "예상 시간" : "Estimate"}</span><span className="inlineInput"><input type="number" name="estimatedMinutes" min="1" max="1440" defaultValue={estimatedMinutes ?? ""} placeholder="—"/><small>{locale === "ko" ? "분" : "min"}</small></span></label>
        <button className="textButton">{locale === "ko" ? "저장" : "Save"}</button>
      </form>
      <form action={updateRecurrenceRule} className="recurrenceForm">
        <input type="hidden" name="taskId" value={taskId}/>
        <div className="recurrenceGrid">
          <label><span>{locale === "ko" ? "반복" : "Repeat"}</span><select name="frequency" defaultValue={rule?.frequency ?? "weekly"}><option value="daily">{locale === "ko" ? "매일" : "Daily"}</option><option value="weekly">{locale === "ko" ? "매주" : "Weekly"}</option><option value="monthly">{locale === "ko" ? "매월" : "Monthly"}</option></select></label>
          <label><span>{locale === "ko" ? "간격" : "Interval"}</span><input type="number" name="interval" min="1" max="365" defaultValue={rule?.interval ?? 1}/></label>
          <label><span>{locale === "ko" ? "시작" : "Starts"}</span><input type="date" name="startsOn" defaultValue={rule?.startsOn.toISOString().slice(0, 10) ?? today} required/></label>
          <label><span>{locale === "ko" ? "종료(선택)" : "Ends (optional)"}</span><input type="date" name="endsOn" defaultValue={rule?.endsOn?.toISOString().slice(0, 10) ?? ""}/></label>
          <label><span>{locale === "ko" ? "매월 날짜" : "Day of month"}</span><input type="number" name="monthDay" min="1" max="31" defaultValue={rule?.monthDay ?? new Date(`${today}T00:00:00Z`).getUTCDate()}/></label>
        </div>
        <fieldset className="weekdayPicker"><legend>{locale === "ko" ? "매주 반복 요일" : "Weekly days"}</legend>{weekdayLabels.map((label, day) => <label key={day}><input type="checkbox" name="weekdays" value={day} defaultChecked={rule?.weekdays.includes(day) ?? day === new Date(`${today}T00:00:00Z`).getUTCDay()}/><span>{label}</span></label>)}</fieldset>
        <div className="planningButtons"><button className="textButton accent">{rule ? (locale === "ko" ? "반복 수정" : "Update repeat") : (locale === "ko" ? "반복 설정" : "Set repeat")}</button></div>
      </form>
      {rule && <form action={deleteRecurrenceRule}><input type="hidden" name="taskId" value={taskId}/><button className="textButton dangerText">{locale === "ko" ? "반복 종료" : "Stop repeating"}</button></form>}
    </div>
  </details>;
}

