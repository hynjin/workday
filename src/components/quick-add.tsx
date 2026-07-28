"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { quickAddTaskState } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { getWorkdayDate } from "@/lib/workday-date";

type Destination = "inbox" | "today" | "tomorrow" | "date";

export function QuickAdd({ projects, areas, locale }: { projects: { id: string; title: string }[]; areas: { id: string; title: string }[]; locale: Locale }) {
  const today = getWorkdayDate();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [destination, setDestination] = useState<Destination>("inbox");
  const [location, setLocation] = useState("");
  const [, action, pending] = useActionState(quickAddTaskState, { success: false, nonce: 0 });

  const closeAndReset = () => {
    if (detailsRef.current) detailsRef.current.open = false;
    formRef.current?.reset();
    setDestination("inbox");
    setLocation("");
  };

  useEffect(() => {
    const open = () => {
      if (detailsRef.current) detailsRef.current.open = true;
      requestAnimationFrame(() => titleRef.current?.focus());
    };
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && detailsRef.current?.open) closeAndReset();
    };
    window.addEventListener("workday:quick-add", open);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("workday:quick-add", open);
      window.removeEventListener("keydown", close);
    };
  }, []);

  const submit = async (form: FormData) => {
    await action(form);
    closeAndReset();
  };

  const schedules: { value: Destination; ko: string; en: string }[] = [
    { value: "inbox", ko: "일정 없음", en: "No date" },
    { value: "today", ko: "오늘", en: "Today" },
    { value: "tomorrow", ko: "내일", en: "Tomorrow" },
    { value: "date", ko: "날짜 선택", en: "Choose date" },
  ];

  return <details className="quickAdd" ref={detailsRef}>
    <summary aria-label={locale === "ko" ? "빠른 작업 추가" : "Quick add"}>{locale === "ko" ? "빠른 추가" : "Quick add"} <kbd>Q</kbd></summary>
    <button className="quickAddBackdrop" type="button" aria-label={locale === "ko" ? "빠른 추가 닫기" : "Close quick add"} onClick={closeAndReset}/>
    <form ref={formRef} action={submit} className="quickAddForm">
      <div className="quickAddHeader"><div><strong>{locale === "ko" ? "새 작업" : "New task"}</strong><small>{locale === "ko" ? "어느 화면에서든 바로 수집하고 계획합니다." : "Capture and schedule from anywhere."}</small></div><button type="button" className="iconButton" onClick={closeAndReset} aria-label={locale === "ko" ? "닫기" : "Close"}>×</button></div>
      <input ref={titleRef} name="title" placeholder={locale === "ko" ? "작업 이름" : "Task name"} aria-label={locale === "ko" ? "작업 이름" : "Task name"} maxLength={120} required autoComplete="off"/>
      <label className="quickEstimate"><span>{locale === "ko" ? "예상 시간(분)" : "Estimate (min)"}</span><input type="number" name="estimatedMinutes" min="1" max="1440" placeholder="—"/></label>
      <input type="hidden" name="areaId" value={location.startsWith("area:") ? location.slice(5) : ""}/>
      <input type="hidden" name="projectId" value={location.startsWith("project:") ? location.slice(8) : ""}/>
      <label className="quickProject"><span>{locale === "ko" ? "이동할 목록" : "Move to"}</span><select value={location} onChange={event => setLocation(event.target.value)}><option value="">Inbox</option>{areas.length > 0 && <optgroup label="Areas">{areas.map(area => <option value={`area:${area.id}`} key={area.id}>{area.title}</option>)}</optgroup>}{projects.length > 0 && <optgroup label={locale === "ko" ? "프로젝트" : "Projects"}>{projects.map(project => <option value={`project:${project.id}`} key={project.id}>{project.title}</option>)}</optgroup>}</select></label>
      <fieldset className="quickSchedule"><legend>{locale === "ko" ? "빠른 일정" : "Quick schedule"}</legend>{schedules.map(item => <label key={item.value}><input type="radio" name="destination" value={item.value} checked={destination === item.value} onChange={() => setDestination(item.value)}/><span>{locale === "ko" ? item.ko : item.en}</span></label>)}</fieldset>
      {destination === "date" && <label className="quickDate"><span>{locale === "ko" ? "날짜" : "Date"}</span><input type="date" name="date" min={today} defaultValue={today} required/></label>}
      <button className="button full" disabled={pending}>{pending ? (locale === "ko" ? "저장 중…" : "Saving…") : (locale === "ko" ? "작업 추가" : "Add task")}</button>
    </form>
  </details>;
}
