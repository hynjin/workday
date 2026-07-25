"use client";

import { useEffect, useRef, useState } from "react";
import { quickAddTask } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { getWorkdayDate } from "@/lib/workday-date";

type Destination = "inbox" | "today" | "tomorrow" | "date";

export function QuickAdd({ projects, locale }: { projects: { id: string; title: string }[]; locale: Locale }) {
  const today = getWorkdayDate();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [destination, setDestination] = useState<Destination>("inbox");

  useEffect(() => {
    const open = () => {
      if (detailsRef.current) detailsRef.current.open = true;
      requestAnimationFrame(() => titleRef.current?.focus());
    };
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && detailsRef.current?.open) detailsRef.current.open = false;
    };
    window.addEventListener("workday:quick-add", open);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("workday:quick-add", open);
      window.removeEventListener("keydown", close);
    };
  }, []);

  const schedules: { value: Destination; ko: string; en: string }[] = [
    { value: "inbox", ko: "일정 없음", en: "No date" },
    { value: "today", ko: "오늘", en: "Today" },
    { value: "tomorrow", ko: "내일", en: "Tomorrow" },
    { value: "date", ko: "날짜 선택", en: "Choose date" },
  ];

  return <details className="quickAdd" ref={detailsRef}>
    <summary aria-label={locale === "ko" ? "빠른 작업 추가" : "Quick add"}>{locale === "ko" ? "빠른 추가" : "Quick add"} <kbd>Q</kbd></summary>
    <form action={quickAddTask} className="quickAddForm">
      <div><strong>{locale === "ko" ? "새 작업" : "New task"}</strong><small>{locale === "ko" ? "어느 화면에서든 바로 수집하고 계획합니다." : "Capture and schedule from anywhere."}</small></div>
      <input ref={titleRef} name="title" placeholder={locale === "ko" ? "작업 이름" : "Task name"} aria-label={locale === "ko" ? "작업 이름" : "Task name"} maxLength={120} required autoComplete="off"/>
      <label className="quickEstimate"><span>{locale === "ko" ? "예상 시간(분)" : "Estimate (min)"}</span><input type="number" name="estimatedMinutes" min="1" max="1440" placeholder="—"/></label>
      <label className="quickProject"><span>{locale === "ko" ? "위치" : "Location"}</span><select name="projectId" defaultValue=""><option value="">{locale === "ko" ? "받은편지함" : "Inbox"}</option>{projects.map(project => <option value={project.id} key={project.id}>{project.title}</option>)}</select></label>
      <fieldset className="quickSchedule"><legend>{locale === "ko" ? "빠른 일정" : "Quick schedule"}</legend>{schedules.map(item => <label key={item.value}><input type="radio" name="destination" value={item.value} checked={destination === item.value} onChange={() => setDestination(item.value)}/><span>{locale === "ko" ? item.ko : item.en}</span></label>)}</fieldset>
      {destination === "date" && <label className="quickDate"><span>{locale === "ko" ? "날짜" : "Date"}</span><input type="date" name="date" min={today} defaultValue={today} required/></label>}
      <button className="button full">{locale === "ko" ? "작업 추가" : "Add task"}</button>
    </form>
  </details>;
}
