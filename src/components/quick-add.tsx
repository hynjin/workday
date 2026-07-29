"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { quickAddTaskState } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { getWorkdayDate } from "@/lib/workday-date";

type Destination = "inbox" | "date";
type Priority = "low" | "normal" | "high";

export function QuickAdd({ projects, areas, locale }: { projects: { id: string; title: string; color: string }[]; areas: { id: string; title: string; color: string }[]; locale: Locale }) {
  const today = getWorkdayDate();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const [destination, setDestination] = useState<Destination>("inbox");
  const [location, setLocation] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [estimateEnabled, setEstimateEnabled] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [preset, setPreset] = useState(30);
  const [priority, setPriority] = useState<Priority>("normal");
  const [, action, pending] = useActionState(quickAddTaskState, { success: false, nonce: 0 });

  const locations = useMemo(() => [
    { value: "", title: locale === "ko" ? "수집함" : "Inbox", color: "sky" },
    ...areas.map(area => ({ value: `area:${area.id}`, title: area.title, color: area.color })),
    ...projects.map(project => ({ value: `project:${project.id}`, title: project.title, color: project.color })),
  ], [areas, projects, locale]);
  const selectedLocation = locations.find(item => item.value === location) ?? locations[0];
  const filteredLocations = locations.filter(item => item.title.toLocaleLowerCase().includes(locationQuery.toLocaleLowerCase()));
  const estimatedMinutes = estimateEnabled ? Math.max(1, hours * 60 + minutes) : "";

  const closeAndReset = () => {
    if (detailsRef.current) detailsRef.current.open = false;
    formRef.current?.reset();
    setDestination("inbox");
    setLocation("");
    setLocationOpen(false);
    setLocationQuery("");
    setEstimateEnabled(false);
    setHours(0);
    setMinutes(30);
    setPreset(30);
    setPriority("normal");
  };

  useEffect(() => {
    const open = () => {
      if (detailsRef.current) detailsRef.current.open = true;
      requestAnimationFrame(() => titleRef.current?.focus());
    };
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && locationOpen) setLocationOpen(false);
      else if (event.key === "Escape" && detailsRef.current?.open) closeAndReset();
    };
    const outside = (event: PointerEvent) => {
      if (!locationRef.current?.contains(event.target as Node)) setLocationOpen(false);
    };
    window.addEventListener("workday:quick-add", open);
    window.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("workday:quick-add", open);
      window.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, [locationOpen]);

  const submit = async (form: FormData) => {
    await action(form);
    closeAndReset();
  };
  const choosePreset = (value: number) => {
    setPreset(value);
    setHours(Math.floor(value / 60));
    setMinutes(value % 60);
  };

  return <details className="quickAdd" ref={detailsRef}>
    <summary aria-label={locale === "ko" ? "새 작업" : "New task"}>+</summary>
    <button className="quickAddBackdrop" type="button" aria-label={locale === "ko" ? "새 작업 닫기" : "Close new task"} onClick={closeAndReset}/>
    <form ref={formRef} action={submit} className="quickAddForm">
      <header className="quickAddHeader"><div><strong>{locale === "ko" ? "새 작업" : "New task"}</strong><small>{locale === "ko" ? "필요한 항목만 빠르게 설정하세요." : "Set only what you need."}</small></div><button type="button" className="quickClose" onClick={closeAndReset} aria-label={locale === "ko" ? "닫기" : "Close"}>×</button></header>
      <div className="quickAddBody">
        <input ref={titleRef} className="quickTaskName" name="title" placeholder={locale === "ko" ? "무엇을 해야 하나요?" : "What needs to be done?"} maxLength={120} required autoComplete="off"/>

        <div className="quickField"><span className="quickLabel">{locale === "ko" ? "위치" : "Location"}</span><div className="quickSelect" ref={locationRef}>
          <button type="button" className="quickSelectTrigger" onClick={() => setLocationOpen(value => !value)}><span><i className={`colorDot ${selectedLocation.color}`}/>{selectedLocation.title}</span><span aria-hidden="true">⌄</span></button>
          {locationOpen && <div className="quickSelectMenu"><input value={locationQuery} onChange={event => setLocationQuery(event.target.value)} placeholder={locale === "ko" ? "영역 또는 프로젝트 검색" : "Search areas or projects"}/><div>{filteredLocations.map(item => <button type="button" key={item.value || "inbox"} onClick={() => { setLocation(item.value); setLocationOpen(false); setLocationQuery(""); }}><i className={`colorDot ${item.color}`}/>{item.title}</button>)}</div></div>}
        </div></div>
        <input type="hidden" name="areaId" value={location.startsWith("area:") ? location.slice(5) : ""}/>
        <input type="hidden" name="projectId" value={location.startsWith("project:") ? location.slice(8) : ""}/>

        <div className="quickField"><div className="quickFieldHead"><span className="quickLabel">{locale === "ko" ? "예상 시간" : "Estimate"}</span><label className="quickSwitch"><input type="checkbox" checked={estimateEnabled} onChange={event => setEstimateEnabled(event.target.checked)}/><span/><b>{estimateEnabled ? (locale === "ko" ? "시간 설정" : "Set time") : (locale === "ko" ? "설정 안 함" : "Not set")}</b></label></div>
          <div className={`quickTime ${estimateEnabled ? "" : "disabled"}`}><div className="quickDuration"><label><input type="number" min="0" max="23" value={hours} onChange={event => { setHours(Number(event.target.value)); setPreset(-1); }}/><span>{locale === "ko" ? "시간" : "hr"}</span></label><label><input type="number" min="0" max="59" value={minutes} onChange={event => { setMinutes(Number(event.target.value)); setPreset(-1); }}/><span>{locale === "ko" ? "분" : "min"}</span></label></div><div className="quickPresets">{[15,30,45,60].map(value => <button type="button" className={preset === value ? "active" : ""} onClick={() => choosePreset(value)} key={value}>{value === 60 ? (locale === "ko" ? "1시간" : "1 hr") : `${value}${locale === "ko" ? "분" : " min"}`}</button>)}</div></div>
          <input type="hidden" name="estimatedMinutes" value={estimatedMinutes}/>
        </div>

        <div className="quickField"><span className="quickLabel">{locale === "ko" ? "우선순위" : "Priority"}</span><div className="quickPriority">{(["low","normal","high"] as Priority[]).map(level => <label className={`${level} ${priority === level ? "active" : ""}`} key={level}><input type="radio" name="priority" value={level} checked={priority === level} onChange={() => setPriority(level)}/><span>{level === "low" ? (locale === "ko" ? "낮음" : "Low") : level === "normal" ? (locale === "ko" ? "보통" : "Normal") : (locale === "ko" ? "높음" : "High")}</span></label>)}</div></div>

        <div className="quickField"><span className="quickLabel">{locale === "ko" ? "일정" : "Schedule"}</span><div className="quickScheduleChoice"><label className={destination === "inbox" ? "active" : ""}><input type="radio" name="destination" value="inbox" checked={destination === "inbox"} onChange={() => setDestination("inbox")}/><span>{locale === "ko" ? "일정 없음" : "No date"}</span></label><label className={destination === "date" ? "active" : ""}><input type="radio" name="destination" value="date" checked={destination === "date"} onChange={() => setDestination("date")}/><span>{locale === "ko" ? "날짜 선택" : "Choose date"}</span></label></div>
          {destination === "date" && <div className="quickCalendar"><input type="date" name="date" min={today} defaultValue={today} required/></div>}
        </div>

        <label className="quickField"><span className="quickLabel">{locale === "ko" ? "반복" : "Repeat"}</span><select name="repeat" defaultValue="none"><option value="none">{locale === "ko" ? "반복 없음" : "No repeat"}</option><option value="daily">{locale === "ko" ? "매일" : "Daily"}</option><option value="weekly">{locale === "ko" ? "매주" : "Weekly"}</option><option value="monthly">{locale === "ko" ? "매월" : "Monthly"}</option></select></label>
      </div>
      <footer className="quickAddFooter"><button type="button" className="button secondary" onClick={closeAndReset}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="button" disabled={pending}>{pending ? (locale === "ko" ? "저장 중…" : "Saving…") : (locale === "ko" ? "작업 추가" : "Add task")}</button></footer>
    </form>
  </details>;
}
