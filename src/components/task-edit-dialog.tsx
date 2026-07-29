"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteRecurrenceRule, moveTaskToArea, moveTaskToProject, scheduleTaskForDate,
  unscheduleTask, updateRecurrenceRule, updateTask,
} from "@/lib/actions";
import { getWorkdayDate } from "@/lib/workday-date";
import { DateCalendarPicker } from "@/components/date-calendar-picker";

type Locale = "ko" | "en";
type Priority = "low" | "normal" | "high";
type Option = { id: string; title: string; color: string };

export function TaskEditDialog({ task, projects, areas, locale }: {
  task: {
    id: string; title: string; priority: Priority; estimatedMinutes: number | null;
    projectId: string | null; areaId: string | null;
    scheduledItem: { id: string; date: string } | null;
    repeat: "none" | "daily" | "weekly" | "monthly";
  };
  projects: Option[];
  areas: Option[];
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const [estimate, setEstimate] = useState(task.estimatedMinutes !== null);
  const [schedule, setSchedule] = useState<"none" | "date">(task.scheduledItem ? "date" : "none");
  const [priority, setPriority] = useState(task.priority);
  const panel = useRef<HTMLElement>(null);
  const today = getWorkdayDate();
  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);
  const save = async (data: FormData) => {
    data.set("taskId", task.id);
    await updateTask(data);
    const location = String(data.get("location") ?? "");
    const move = new FormData();
    move.set("taskId", task.id);
    if (location.startsWith("project:")) {
      move.set("projectId", location.slice(8));
      await moveTaskToProject(move);
    } else {
      move.set("areaId", location.startsWith("area:") ? location.slice(5) : "");
      await moveTaskToArea(move);
    }
    if (schedule === "date") {
      const scheduleData = new FormData();
      scheduleData.set("taskId", task.id);
      scheduleData.set("date", String(data.get("date") ?? today));
      if (task.scheduledItem) scheduleData.set("scheduledItemId", task.scheduledItem.id);
      await scheduleTaskForDate(scheduleData);
    } else if (task.scheduledItem) {
      const clearData = new FormData();
      clearData.set("taskId", task.id);
      clearData.set("scheduledItemId", task.scheduledItem.id);
      await unscheduleTask(clearData);
    }
    const repeat = String(data.get("repeat") ?? "none");
    if (repeat === "none") {
      if (task.repeat !== "none") {
        const repeatData = new FormData();
        repeatData.set("taskId", task.id);
        await deleteRecurrenceRule(repeatData);
      }
    } else {
      const repeatData = new FormData();
      repeatData.set("taskId", task.id);
      repeatData.set("frequency", repeat);
      repeatData.set("interval", "1");
      repeatData.set("startsOn", String(data.get("date") || today));
      repeatData.set("monthDay", String(new Date(`${String(data.get("date") || today)}T00:00:00Z`).getUTCDate()));
      repeatData.append("weekdays", String(new Date(`${String(data.get("date") || today)}T00:00:00Z`).getUTCDay()));
      await updateRecurrenceRule(repeatData);
    }
    setOpen(false);
  };
  const location = task.projectId ? `project:${task.projectId}` : task.areaId ? `area:${task.areaId}` : "";
  return <>
    <button className="wd-edit-menu-item" type="button" onClick={() => setOpen(true)}>{locale === "ko" ? "수정" : "Edit"}</button>
    {open && createPortal(<div className="wd-dialog-layer" onPointerDown={event => event.target === event.currentTarget && setOpen(false)}>
      <section className="wd-dialog wd-task-dialog" ref={panel} role="dialog" aria-modal="true">
        <header><h2>{locale === "ko" ? "작업 수정" : "Edit task"}</h2><button type="button" onClick={() => setOpen(false)}>×</button></header>
        <form action={save} className="wd-dialog-form">
          <div className="wd-dialog-body">
            <label className="wd-field"><span>{locale === "ko" ? "작업 이름" : "Task name"}</span><input name="title" defaultValue={task.title} required maxLength={120}/></label>
            <label className="wd-field wd-field-spaced"><span>{locale === "ko" ? "위치" : "Location"}</span><select name="location" defaultValue={location}><option value="">{locale === "ko" ? "수집함" : "Inbox"}</option>{areas.map(area => <option value={`area:${area.id}`} key={area.id}>● {area.title}</option>)}{projects.map(project => <option value={`project:${project.id}`} key={project.id}>● {project.title}</option>)}</select></label>
            <div className="wd-edit-estimate"><label><input type="checkbox" checked={estimate} onChange={event => setEstimate(event.target.checked)}/><span>{locale === "ko" ? "예상 시간" : "Estimate"}</span><b>{estimate ? (locale === "ko" ? "설정" : "Set") : (locale === "ko" ? "설정 안 함" : "Not set")}</b></label>{estimate && <label className="wd-field"><input type="number" name="estimatedMinutes" min="1" max="1440" defaultValue={task.estimatedMinutes ?? 30}/></label>} {!estimate && <input type="hidden" name="estimatedMinutes" value=""/>}</div>
            <div className="wd-edit-block"><span className="wd-edit-label">{locale === "ko" ? "우선순위" : "Priority"}</span><div className="quickPriority">{(["low","normal","high"] as Priority[]).map(level => <label className={`${level} ${priority === level ? "active" : ""}`} key={level}><input type="radio" name="priority" value={level} checked={priority === level} onChange={() => setPriority(level)}/><span>{level === "low" ? (locale === "ko" ? "낮음" : "Low") : level === "normal" ? (locale === "ko" ? "보통" : "Normal") : (locale === "ko" ? "높음" : "High")}</span></label>)}</div></div>
            <div className="wd-edit-block"><span className="wd-edit-label">{locale === "ko" ? "일정" : "Schedule"}</span><div className="quickScheduleChoice"><button type="button" className={schedule === "none" ? "active" : ""} onClick={() => setSchedule("none")}>{locale === "ko" ? "일정 없음" : "No date"}</button><button type="button" className={schedule === "date" ? "active" : ""} onClick={() => setSchedule("date")}>{locale === "ko" ? "날짜 선택" : "Choose date"}</button></div>{schedule === "date" && <div className="quickCalendar"><DateCalendarPicker initial={task.scheduledItem?.date ?? today} min={today} locale={locale}/></div>}</div>
            <label className="wd-field wd-field-spaced"><span>{locale === "ko" ? "반복" : "Repeat"}</span><select name="repeat" defaultValue={task.repeat}><option value="none">{locale === "ko" ? "반복 없음" : "No repeat"}</option><option value="daily">{locale === "ko" ? "매일" : "Daily"}</option><option value="weekly">{locale === "ko" ? "매주" : "Weekly"}</option><option value="monthly">{locale === "ko" ? "매월" : "Monthly"}</option></select></label>
          </div>
          <footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "저장" : "Save"}</button></footer>
        </form>
      </section>
    </div>, document.body)}
  </>;
}
