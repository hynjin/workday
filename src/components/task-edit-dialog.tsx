"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
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
type SelectOption = { value: string; label: string; color?: string };

function FloatingSelect({ value, onChange, options, label }: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = options.find(option => option.value === value) ?? options[0];
  const toggle = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) {
      const height = Math.min(220, options.length * 36 + 14);
      setStyle({
        position:"fixed",
        left:rect.left,
        top:rect.bottom + 6 + height <= window.innerHeight - 10 ? rect.bottom + 6 : Math.max(10, rect.top - height - 6),
        width:rect.width,
      });
    }
    setOpen(current => !current);
  };
  return <div className="quickSelect">
    <button ref={trigger} type="button" className="quickSelectTrigger" aria-label={label} aria-expanded={open} onClick={toggle}><span>{selected.color && <i className={`colorDot ${selected.color}`}/>} {selected.label}</span><span aria-hidden="true">⌄</span></button>
    {open && createPortal(<><button className="wd-select-backdrop" type="button" aria-label={label} onClick={() => setOpen(false)}/><div className="quickSelectMenu isFloating wd-edit-select-menu" style={style}>{options.map(option => <button type="button" key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}>{option.color && <i className={`colorDot ${option.color}`}/>} {option.label}</button>)}</div></>, document.body)}
  </div>;
}

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
  const [location, setLocation] = useState(task.projectId ? `project:${task.projectId}` : task.areaId ? `area:${task.areaId}` : "");
  const [repeat, setRepeat] = useState(task.repeat);
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
  const locationOptions: SelectOption[] = [
    { value:"", label:locale === "ko" ? "수집함" : "Inbox", color:"sky" },
    ...areas.map(area => ({ value:`area:${area.id}`, label:area.title, color:area.color })),
    ...projects.map(project => ({ value:`project:${project.id}`, label:project.title, color:project.color })),
  ];
  const repeatOptions: SelectOption[] = [
    { value:"none", label:locale === "ko" ? "반복 없음" : "No repeat" },
    { value:"daily", label:locale === "ko" ? "매일" : "Daily" },
    { value:"weekly", label:locale === "ko" ? "매주" : "Weekly" },
    { value:"monthly", label:locale === "ko" ? "매월" : "Monthly" },
  ];
  return <>
    <button className="wd-edit-menu-item" type="button" onClick={() => setOpen(true)}>{locale === "ko" ? "수정" : "Edit"}</button>
    {open && createPortal(<div className="wd-dialog-layer" onPointerDown={event => event.target === event.currentTarget && setOpen(false)}>
      <section className="wd-dialog wd-task-dialog" ref={panel} role="dialog" aria-modal="true">
        <header><h2>{locale === "ko" ? "작업 수정" : "Edit task"}</h2><button type="button" onClick={() => setOpen(false)}>×</button></header>
        <form action={save} className="wd-dialog-form">
          <div className="wd-dialog-body">
            <label className="wd-field"><span>{locale === "ko" ? "작업 이름" : "Task name"}</span><input name="title" defaultValue={task.title} required maxLength={120}/></label>
            <div className="wd-field wd-field-spaced"><span>{locale === "ko" ? "위치" : "Location"}</span><input type="hidden" name="location" value={location}/><FloatingSelect value={location} onChange={setLocation} options={locationOptions} label={locale === "ko" ? "위치 선택" : "Choose location"}/></div>
            <div className="wd-edit-estimate"><label><input type="checkbox" checked={estimate} onChange={event => setEstimate(event.target.checked)}/><span>{locale === "ko" ? "예상 시간" : "Estimate"}</span><b>{estimate ? (locale === "ko" ? "설정" : "Set") : (locale === "ko" ? "설정 안 함" : "Not set")}</b></label>{estimate && <label className="wd-field"><input type="number" name="estimatedMinutes" min="1" max="1440" defaultValue={task.estimatedMinutes ?? 30}/></label>} {!estimate && <input type="hidden" name="estimatedMinutes" value=""/>}</div>
            <div className="wd-edit-block"><span className="wd-edit-label">{locale === "ko" ? "우선순위" : "Priority"}</span><div className="quickPriority">{(["low","normal","high"] as Priority[]).map(level => <label className={`${level} ${priority === level ? "active" : ""}`} key={level}><input type="radio" name="priority" value={level} checked={priority === level} onChange={() => setPriority(level)}/><span>{level === "low" ? (locale === "ko" ? "낮음" : "Low") : level === "normal" ? (locale === "ko" ? "보통" : "Normal") : (locale === "ko" ? "높음" : "High")}</span></label>)}</div></div>
            <div className="wd-edit-block"><span className="wd-edit-label">{locale === "ko" ? "일정" : "Schedule"}</span><div className="quickScheduleChoice"><button type="button" className={schedule === "none" ? "active" : ""} onClick={() => setSchedule("none")}>{locale === "ko" ? "일정 없음" : "No date"}</button><button type="button" className={schedule === "date" ? "active" : ""} onClick={() => setSchedule("date")}>{locale === "ko" ? "날짜 선택" : "Choose date"}</button></div>{schedule === "date" && <div className="quickCalendar"><DateCalendarPicker initial={task.scheduledItem?.date ?? today} min={today} locale={locale}/></div>}</div>
            <div className="wd-field wd-field-spaced"><span>{locale === "ko" ? "반복" : "Repeat"}</span><input type="hidden" name="repeat" value={repeat}/><FloatingSelect value={repeat} onChange={value => setRepeat(value as typeof repeat)} options={repeatOptions} label={locale === "ko" ? "반복 선택" : "Choose repeat"}/></div>
          </div>
          <footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "저장" : "Save"}</button></footer>
        </form>
      </section>
    </div>, document.body)}
  </>;
}
