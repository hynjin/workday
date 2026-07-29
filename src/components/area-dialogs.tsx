"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createArea, createProject, updateArea, updateProjectArea } from "@/lib/actions";

type Locale = "ko" | "en";
type ProjectOption = { id: string; title: string; color: string };

function DialogFrame({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("keydown", escape);
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLInputElement>("input")?.focus());
    return () => document.removeEventListener("keydown", escape);
  }, [close]);
  return createPortal(<div className="wd-dialog-layer" onPointerDown={event => event.target === event.currentTarget && close()}>
    <section className="wd-dialog" ref={panelRef} role="dialog" aria-modal="true" aria-label={title}>
      <header><h2>{title}</h2><button type="button" onClick={close} aria-label="Close">×</button></header>
      {children}
    </section>
  </div>, document.body);
}

export function NewAreaButton({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="wd-button is-primary" type="button" onClick={() => setOpen(true)}><span aria-hidden="true">＋</span>{locale === "ko" ? "새 영역" : "New Area"}</button>
    {open && <DialogFrame title={locale === "ko" ? "새 영역" : "New Area"} close={() => setOpen(false)}>
      <form action={createArea} className="wd-dialog-form">
        <div className="wd-dialog-body">
          <label className="wd-field"><span>{locale === "ko" ? "영역 이름" : "Area name"}</span><input name="title" required maxLength={120} placeholder={locale === "ko" ? "예: 건강" : "e.g. Health"}/></label>
          <fieldset className="wd-swatches"><legend>{locale === "ko" ? "색상" : "Color"}</legend>{["sky","mint","lilac","peach","butter"].map(color => <label key={color}><input type="radio" name="color" value={color} defaultChecked={color === "mint"}/><i className={`wd-dot ${color}`}/></label>)}</fieldset>
        </div>
        <footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "확인" : "Confirm"}</button></footer>
      </form>
    </DialogFrame>}
  </>;
}

export function AreaProjectButton({ areaId, projects, locale }: { areaId: string; projects: ProjectOption[]; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => projects.filter(project => project.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [projects, query]);
  return <>
    <button className="wd-button" type="button" onClick={() => setOpen(true)}><span aria-hidden="true">＋</span>{locale === "ko" ? "프로젝트" : "Project"}</button>
    {open && <DialogFrame title={locale === "ko" ? "프로젝트 연결" : "Connect project"} close={() => setOpen(false)}>
      <div className="wd-dialog-body">
        <div className="wd-mode-tabs"><button type="button" className={mode === "existing" ? "is-active" : ""} onClick={() => setMode("existing")}>{locale === "ko" ? "기존 프로젝트" : "Existing project"}</button><button type="button" className={mode === "new" ? "is-active" : ""} onClick={() => setMode("new")}>{locale === "ko" ? "새 프로젝트" : "New project"}</button></div>
        {mode === "existing" ? <div className="wd-project-picker">
          <label className="wd-search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={locale === "ko" ? "프로젝트 검색" : "Search projects"}/></label>
          <div>{filtered.map(project => <form action={updateProjectArea} key={project.id}><input type="hidden" name="projectId" value={project.id}/><input type="hidden" name="areaId" value={areaId}/><button><span><i className={`wd-dot ${project.color}`}/>{project.title}</span><b>＋</b></button></form>)}{!filtered.length && <p>{locale === "ko" ? "연결할 프로젝트가 없습니다." : "No projects to connect."}</p>}</div>
        </div> : <form action={createProject} className="wd-dialog-form"><input type="hidden" name="areaId" value={areaId}/><label className="wd-field"><span>{locale === "ko" ? "프로젝트 이름" : "Project name"}</span><input name="title" required maxLength={120} placeholder={locale === "ko" ? "예: 아침 루틴 만들기" : "e.g. Build a morning routine"}/></label><footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "확인" : "Confirm"}</button></footer></form>}
      </div>
    </DialogFrame>}
  </>;
}

export function AreaTaskButton({ areaId, locale }: { areaId: string; locale: Locale }) {
  return <button className="wd-button" type="button" onClick={() => window.dispatchEvent(new CustomEvent("workday:quick-add", { detail: { location: `area:${areaId}` } }))}><span aria-hidden="true">＋</span>{locale === "ko" ? "작업" : "Task"}</button>;
}

export function EditAreaDialog({ area, locale }: { area: { id: string; title: string; color: string }; locale: Locale }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="wd-edit-menu-item" type="button" onClick={() => setOpen(true)}>{locale === "ko" ? "수정" : "Edit"}</button>
    {open && <DialogFrame title={locale === "ko" ? "영역 수정" : "Edit Area"} close={() => setOpen(false)}><form action={updateArea} className="wd-dialog-form"><div className="wd-dialog-body"><input type="hidden" name="areaId" value={area.id}/><label className="wd-field"><span>{locale === "ko" ? "영역 이름" : "Area name"}</span><input name="title" defaultValue={area.title} required maxLength={120}/></label><fieldset className="wd-swatches"><legend>{locale === "ko" ? "색상" : "Color"}</legend>{["sky","mint","lilac","peach","butter"].map(color => <label key={color}><input type="radio" name="color" value={color} defaultChecked={color === area.color}/><i className={`wd-dot ${color}`}/></label>)}</fieldset></div><footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "저장" : "Save"}</button></footer></form></DialogFrame>}
  </>;
}
