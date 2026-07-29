"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createProject, createSection, updateProject, updateProjectArea, updateSection } from "@/lib/actions";

type Locale = "ko" | "en";
type Area = { id: string; title: string; color?: string };

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("keydown", escape);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLInputElement>("input")?.focus());
    return () => document.removeEventListener("keydown", escape);
  }, [close]);
  return createPortal(<div className="wd-dialog-layer" onPointerDown={event => event.target === event.currentTarget && close()}><section className="wd-dialog" ref={ref} role="dialog" aria-modal="true"><header><h2>{title}</h2><button type="button" onClick={close}>×</button></header>{children}</section></div>, document.body);
}

export function NewProjectButton({ areas, locale }: { areas: Area[]; locale: Locale }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="wd-button is-primary" type="button" onClick={() => setOpen(true)}><span aria-hidden="true">＋</span>{locale === "ko" ? "새 프로젝트" : "New project"}</button>
    {open && <Modal title={locale === "ko" ? "새 프로젝트" : "New project"} close={() => setOpen(false)}>
      <form action={createProject} className="wd-dialog-form"><div className="wd-dialog-body">
        <label className="wd-field"><span>{locale === "ko" ? "프로젝트 이름" : "Project name"}</span><input name="title" required maxLength={120} placeholder={locale === "ko" ? "완료하고 싶은 목표" : "An outcome to complete"}/></label>
        <label className="wd-field wd-field-spaced"><span>{locale === "ko" ? "영역" : "Area"}</span><select name="areaId" defaultValue=""><option value="">{locale === "ko" ? "영역 없음" : "No Area"}</option>{areas.map(area => <option value={area.id} key={area.id}>{area.title}</option>)}</select></label>
        <fieldset className="wd-swatches"><legend>{locale === "ko" ? "색상" : "Color"}</legend>{["sky","mint","lilac","peach","butter"].map(color => <label key={color}><input type="radio" name="color" value={color} defaultChecked={color === "sky"}/><i className={`wd-dot ${color}`}/></label>)}</fieldset>
      </div><footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "확인" : "Confirm"}</button></footer></form>
    </Modal>}
  </>;
}

export function NewSectionButton({ projectId, locale }: { projectId: string; locale: Locale }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="wd-compact-plus" type="button" onClick={() => setOpen(true)}>＋ {locale === "ko" ? "섹션" : "Section"}</button>
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
    {open && <Modal title={locale === "ko" ? "프로젝트 수정" : "Edit project"} close={() => setOpen(false)}><form action={save} className="wd-dialog-form"><div className="wd-dialog-body"><label className="wd-field"><span>{locale === "ko" ? "프로젝트 이름" : "Project name"}</span><input name="title" defaultValue={project.title} required maxLength={120}/></label><label className="wd-field wd-field-spaced"><span>{locale === "ko" ? "영역" : "Area"}</span><select name="areaId" defaultValue={project.areaId ?? ""}><option value="">{locale === "ko" ? "영역 없음" : "No Area"}</option>{areas.map(area => <option value={area.id} key={area.id}>{area.title}</option>)}</select></label><fieldset className="wd-swatches"><legend>{locale === "ko" ? "색상" : "Color"}</legend>{["sky","mint","lilac","peach","butter"].map(color => <label key={color}><input type="radio" name="color" value={color} defaultChecked={color === project.color}/><i className={`wd-dot ${color}`}/></label>)}</fieldset></div><footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "저장" : "Save"}</button></footer></form></Modal>}
  </>;
}

export function EditSectionDialog({ section, locale }: { section: { id: string; title: string }; locale: Locale }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="wd-edit-menu-item" type="button" onClick={() => setOpen(true)}>{locale === "ko" ? "수정" : "Edit"}</button>
    {open && <Modal title={locale === "ko" ? "섹션 수정" : "Edit section"} close={() => setOpen(false)}><form action={updateSection} className="wd-dialog-form"><div className="wd-dialog-body"><input type="hidden" name="sectionId" value={section.id}/><label className="wd-field"><span>{locale === "ko" ? "섹션 이름" : "Section name"}</span><input name="title" defaultValue={section.title} required maxLength={120}/></label></div><footer><button className="wd-button" type="button" onClick={() => setOpen(false)}>{locale === "ko" ? "취소" : "Cancel"}</button><button className="wd-button is-primary">{locale === "ko" ? "저장" : "Save"}</button></footer></form></Modal>}
  </>;
}
