"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { quickAddTaskState } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { getWorkdayDate } from "@/lib/workday-date";
import { DateCalendarPicker } from "@/components/date-calendar-picker";

type Destination = "inbox" | "date";
type Priority = "low" | "normal" | "high";

export function QuickAdd({ projects, areas, locale }: { projects: { id: string; title: string; color: string }[]; areas: { id: string; title: string; color: string }[]; locale: Locale }) {
  const today = getWorkdayDate();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const repeatRef = useRef<HTMLDivElement>(null);
  const [destination, setDestination] = useState<Destination>("inbox");
  const [location, setLocation] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationMenuStyle, setLocationMenuStyle] = useState<CSSProperties>({});
  const [locationQuery, setLocationQuery] = useState("");
  const [estimateEnabled, setEstimateEnabled] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [preset, setPreset] = useState(30);
  const [priority, setPriority] = useState<Priority>("normal");
  const [repeat, setRepeat] = useState("none");
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatMenuStyle, setRepeatMenuStyle] = useState<CSSProperties>({});
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
    setRepeat("none");
    setRepeatOpen(false);
  };

  useEffect(() => {
    const open = (event: Event) => {
      const nextLocation = (event as CustomEvent<{ location?: string }>).detail?.location;
      if (nextLocation) setLocation(nextLocation);
      if (detailsRef.current) detailsRef.current.open = true;
      requestAnimationFrame(() => titleRef.current?.focus());
    };
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && repeatOpen) setRepeatOpen(false);
      else if (event.key === "Escape" && locationOpen) setLocationOpen(false);
      else if (event.key === "Escape" && detailsRef.current?.open) closeAndReset();
    };
    const outside = (event: PointerEvent) => {
      if (!locationRef.current?.contains(event.target as Node)) setLocationOpen(false);
      if (!repeatRef.current?.contains(event.target as Node)) setRepeatOpen(false);
    };
    window.addEventListener("workday:quick-add", open);
    window.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("workday:quick-add", open);
      window.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, [locationOpen, repeatOpen]);

  const submit = async (form: FormData) => {
    await action(form);
    closeAndReset();
  };
  const choosePreset = (value: number) => {
    setPreset(value);
    setHours(Math.floor(value / 60));
    setMinutes(value % 60);
  };
  const floatingMenuStyle = (element: HTMLDivElement | null, estimatedHeight: number) => {
    const rect = element?.getBoundingClientRect();
    if (!rect) return {};
    const below = rect.bottom + 6 + estimatedHeight <= window.innerHeight - 10;
    return {
      position: "fixed" as const,
      left: rect.left,
      top: below ? rect.bottom + 6 : Math.max(10, rect.top - estimatedHeight - 6),
      width: rect.width,
    };
  };

  return <details className="quickAdd" ref={detailsRef}>
    <summary aria-label={locale === "ko" ? "새 작업" : "New task"}>+</summary>
    <button className="quickAddBackdrop" type="button" aria-label={locale === "ko" ? "새 작업 닫기" : "Close new task"} onClick={closeAndReset}/>
    <form ref={formRef} action={submit} className="quickAddForm">
      <header className="quickAddHeader"><div><strong>{locale === "ko" ? "새 작업" : "New task"}</strong><small>{locale === "ko" ? "필요한 항목만 빠르게 설정하세요." : "Set only what you need."}</small></div><button type="button" className="quickClose" onClick={closeAndReset} aria-label={locale === "ko" ? "닫기" : "Close"}>×</button></header>
      <div className="quickAddBody">
        <input ref={titleRef} className="quickTaskName" name="title" placeholder={locale === "ko" ? "무엇을 해야 하나요?" : "What needs to be done?"} maxLength={120} required autoComplete="off"/>

        <div className="quickField"><span className="quickLabel">{locale === "ko" ? "위치" : "Location"}</span><div className="quickSelect" ref={locationRef}>
          <button type="button" className="quickSelectTrigger" onClick={() => { setRepeatOpen(false); setLocationMenuStyle(floatingMenuStyle(locationRef.current, 205)); setLocationOpen(value => !value); }}><span><i className={`colorDot ${selectedLocation.color}`}/>{selectedLocation.title}</span><span aria-hidden="true">⌄</span></button>
          {locationOpen && <div className="quickSelectMenu isFloating" style={locationMenuStyle}><input value={locationQuery} onChange={event => setLocationQuery(event.target.value)} placeholder={locale === "ko" ? "영역 또는 프로젝트 검색" : "Search areas or projects"}/><div>{filteredLocations.map(item => <button type="button" key={item.value || "inbox"} onClick={() => { setLocation(item.value); setLocationOpen(false); setLocationQuery(""); }}><i className={`colorDot ${item.color}`}/>{item.title}</button>)}</div></div>}
        </div></div>
        <input type="hidden" name="areaId" value={location.startsWith("area:") ? location.slice(5) : ""}/>
        <input type="hidden" name="projectId" value={location.startsWith("project:") ? location.slice(8) : ""}/>

        <div className="quickField"><div className="quickFieldHead"><span className="quickLabel">{locale === "ko" ? "예상 시간" : "Estimate"}</span><label className="quickSwitch"><input type="checkbox" checked={estimateEnabled} onChange={event => setEstimateEnabled(event.target.checked)}/><span/><b>{estimateEnabled ? (locale === "ko" ? "시간 설정" : "Set time") : (locale === "ko" ? "설정 안 함" : "Not set")}</b></label></div>
          {estimateEnabled && <div className="quickTime"><div className="quickDuration"><label><input type="number" min="0" max="23" value={hours} onChange={event => { setHours(Number(event.target.value)); setPreset(-1); }}/><span>{locale === "ko" ? "시간" : "hr"}</span></label><label><input type="number" min="0" max="59" value={minutes} onChange={event => { setMinutes(Number(event.target.value)); setPreset(-1); }}/><span>{locale === "ko" ? "분" : "min"}</span></label></div><div className="quickPresets">{[15,30,45,60].map(value => <button type="button" className={preset === value ? "active" : ""} onClick={() => choosePreset(value)} key={value}>{value === 60 ? (locale === "ko" ? "1시간" : "1 hr") : `${value}${locale === "ko" ? "분" : " min"}`}</button>)}</div></div>}
          <input type="hidden" name="estimatedMinutes" value={estimatedMinutes}/>
        </div>

        <div className="quickField"><span className="quickLabel">{locale === "ko" ? "우선순위" : "Priority"}</span><div className="quickPriority">{(["low","normal","high"] as Priority[]).map(level => <label className={`${level} ${priority === level ? "active" : ""}`} key={level}><input type="radio" name="priority" value={level} checked={priority === level} onChange={() => setPriority(level)}/><span>{level === "low" ? (locale === "ko" ? "낮음" : "Low") : level === "normal" ? (locale === "ko" ? "보통" : "Normal") : (locale === "ko" ? "높음" : "High")}</span></label>)}</div></div>

        <div className="quickField"><span className="quickLabel">{locale === "ko" ? "일정" : "Schedule"}</span><input type="hidden" name="destination" value={destination}/><div className="quickScheduleChoice"><button type="button" className={destination === "inbox" ? "active" : ""} onClick={() => setDestination("inbox")}>{locale === "ko" ? "일정 없음" : "No date"}</button><button type="button" className={destination === "date" ? "active" : ""} onClick={() => setDestination("date")}>{locale === "ko" ? "날짜 선택" : "Choose date"}</button></div>
          {destination === "date" && <div className="quickCalendar"><DateCalendarPicker initial={today} min={today} locale={locale}/></div>}
        </div>

        <div className="quickField"><span className="quickLabel">{locale === "ko" ? "반복" : "Repeat"}</span><input type="hidden" name="repeat" value={repeat}/><div className="quickSelect quickRepeat" ref={repeatRef}>
          <button type="button" className="quickSelectTrigger" aria-expanded={repeatOpen} onClick={() => { setLocationOpen(false); setRepeatMenuStyle(floatingMenuStyle(repeatRef.current, 150)); setRepeatOpen(value => !value); }}><span>{repeat === "daily" ? (locale === "ko" ? "매일" : "Daily") : repeat === "weekly" ? (locale === "ko" ? "매주" : "Weekly") : repeat === "monthly" ? (locale === "ko" ? "매월" : "Monthly") : (locale === "ko" ? "반복 없음" : "No repeat")}</span><span aria-hidden="true">⌄</span></button>
          {repeatOpen && <div className="quickSelectMenu quickRepeatMenu isFloating" style={repeatMenuStyle}>{[
            ["none", locale === "ko" ? "반복 없음" : "No repeat"],
            ["daily", locale === "ko" ? "매일" : "Daily"],
            ["weekly", locale === "ko" ? "매주" : "Weekly"],
            ["monthly", locale === "ko" ? "매월" : "Monthly"],
          ].map(([value,label]) => <button type="button" key={value} onClick={() => { setRepeat(value); setRepeatOpen(false); }}>{label}</button>)}</div>}
        </div></div>
      </div>
      <footer className="quickAddFooter"><button type="button" className="button secondary" onClick={closeAndReset}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="button" disabled={pending}>{pending ? (locale === "ko" ? "저장 중…" : "Saving…") : (locale === "ko" ? "작업 추가" : "Add task")}</button></footer>
    </form>
  </details>;
}
