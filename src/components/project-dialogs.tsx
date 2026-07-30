"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { createProject, createSection, updateProject, updateProjectArea, updateSection } from "@/lib/actions";
import { WorkdayIcon } from "@/components/workday-icon";

type Locale = "ko" | "en";
type Area = { id: string; title: string; color?: string };

function AreaSelect({ areas, locale, initial = "" }: { areas: Area[]; locale: Locale; initial?: string }) {
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = areas.find(area => area.id === value);
  const toggle = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) {
      const height = Math.min(210, (areas.length + 1) * 36 + 14);
      setStyle({ position:"fixed", left:rect.left, width:rect.width, top:rect.bottom + 6 + height < window.innerHeight ? rect.bottom + 6 : Math.max(10,rect.top - height - 6) });
    }
    setOpen(current => !current);
  };
  return <div className="quickSelect"><input type="hidden" name="areaId" value={value}/><button ref={trigger} type="button" className="quickSelectTrigger" aria-expanded={open} onClick={toggle}><span><i className={`colorDot ${selected?.color ?? "gray"}`}/>{selected?.title ?? (locale === "ko" ? "영역 없음" : "No area")}</span><WorkdayIcon name="chevronDown" size={16}/></button>{open && createPortal(<><button className="wd-select-backdrop" type="button" aria-label={locale === "ko" ? "영역 선택 닫기" : "Close area picker"} onClick={() => setOpen(false)}/><div className="quickSelectMenu isFloating wd-edit-select-menu" style={style}><button type="button" onClick={() => { setValue(""); setOpen(false); }}><i className="colorDot gray"/>{locale === "ko" ? "영역 없음" : "No area"}</button>{areas.map(area => <button type="button" key={area.id} onClick={() => { setValue(area.id); setOpen(false); }}><i className={`colorDot ${area.color ?? "gray"}`}/>{area.title}</button>)}</div></>,document.body)}</div>;
}

function Modal({ title, description, close, children }: { title: string; description?: string; close: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("keydown", escape);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLInputElement>("input")?.focus());
    return () => document.removeEventListener("keydown", escape);
  }, [close]);
  return createPortal(<div className="wd-dialog-layer" onPointerDown={event => event.target === event.currentTarget && close()}><section className="wd-dialog" ref={ref} role="dialog" aria-modal="true"><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" onClick={close} aria-label="Close"><WorkdayIcon name="close"/></button></header>{children}</section></div>, document.body);
}

export function NewProjectButton({ areas, locale }: { areas: Area[]; locale: Locale }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="wd-button is-primary" type="button" onClick={() => setOpen(true)}><WorkdayIcon name="plus" size={16}/>{locale === "ko" ? "새 프로젝트" : "New project"}</button>
    {open && <Modal title={locale === "ko" ? "새 프로젝트" : "New project"} description={locale === "ko" ? "영역 없이도 프로젝트를 만들 수 있어요." : "A project can exist without an area."} close={() => setOpen(false)}>
      <form action={createProject} className="wd-dialog-form"><div className="wd-dialog-body">
        <label className="wd-field"><span>{locale === "ko" ? "프로젝트 이름" : "Project name"}</span><input name="title" required maxLength={120} placeholder={locale === "ko" ? "완료하고 싶은 목표" : "An outcome to complete"}/></label>
        <div className="wd-field wd-field-spaced"><span>{locale === "ko" ? "영역" : "Area"}</span><AreaSelect areas={areas} locale={locale}/></div>
        <fieldset className="wd-swatches"><legend>{locale === "ko" ? "색상" : "Color"}</legend>{["sky","mint","lilac","peach","butter","gray"].map(color => <label key={color}><input type="radio" name="color" value={color} defaultChecked={color === "sky"}/><i className={`wd-dot ${color}`}/></label>)}</fieldset>
      </div><footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "확인" : "Confirm"}</button></footer></form>
    </Modal>}
  </>;
}

export function NewSectionButton({ projectId, locale }: { projectId: string; locale: Locale }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="wd-compact-plus" type="button" onClick={() => setOpen(true)}><WorkdayIcon name="plus" size={15}/>{locale === "ko" ? "섹션" : "Section"}</button>
    {open && <Modal title={locale === "ko" ? "새 섹션" : "New section"} close={() => setOpen(false)}>
      <form action={createSection} className="wd-dialog-form"><div className="wd-dialog-body"><input type="hidden" name="projectId" value={projectId}/><label className="wd-field"><span>{locale === "ko" ? "섹션 이름" : "Section name"}</span><input name="title" required maxLength={120} placeholder={locale === "ko" ? "예: 진행 중" : "e.g. In progress"}/></label></div><footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "확인" : "Confirm"}</button></footer></form>
    </Modal>}
  </>;
}

export function EditProjectDialog({ project, areas, locale }: { project: { id: string; title: string; color: string; areaId: string | null }; areas: Area[]; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const save = async (data: FormData) => {
    data.set("projectId", project.id);
    await updateProject(data);
    await updateProjectArea(data);
    setOpen(false);
  };
  return <>
    <button className="wd-edit-menu-item" type="button" onClick={() => setOpen(true)}>{locale === "ko" ? "수정" : "Edit"}</button>
    {open && <Modal title={locale === "ko" ? "프로젝트 수정" : "Edit project"} close={() => setOpen(false)}><form action={save} className="wd-dialog-form"><div className="wd-dialog-body"><label className="wd-field"><span>{locale === "ko" ? "프로젝트 이름" : "Project name"}</span><input name="title" defaultValue={project.title} required maxLength={120}/></label><div className="wd-field wd-field-spaced"><span>{locale === "ko" ? "영역" : "Area"}</span><AreaSelect areas={areas} locale={locale} initial={project.areaId ?? ""}/></div><fieldset className="wd-swatches"><legend>{locale === "ko" ? "색상" : "Color"}</legend>{["sky","mint","lilac","peach","butter","gray"].map(color => <label key={color}><input type="radio" name="color" value={color} defaultChecked={color === project.color}/><i className={`wd-dot ${color}`}/></label>)}</fieldset></div><footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "저장" : "Save"}</button></footer></form></Modal>}
  </>;
}

export function EditSectionDialog({ section, locale }: { section: { id: string; title: string }; locale: Locale }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="wd-edit-menu-item" type="button" onClick={() => setOpen(true)}>{locale === "ko" ? "수정" : "Edit"}</button>
    {open && <Modal title={locale === "ko" ? "섹션 수정" : "Edit section"} close={() => setOpen(false)}><form action={updateSection} className="wd-dialog-form"><div className="wd-dialog-body"><input type="hidden" name="sectionId" value={section.id}/><label className="wd-field"><span>{locale === "ko" ? "섹션 이름" : "Section name"}</span><input name="title" defaultValue={section.title} required maxLength={120}/></label></div><footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "저장" : "Save"}</button></footer></form></Modal>}
  </>;
}
