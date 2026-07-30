"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ApprovedIconSprite,
  ApprovedTaskModal,
  type ScheduleItem,
  type ScheduleOption,
  type SchedulePriority,
} from "@/presentation/schedule/schedule-view";
import { TaskMetadata, TaskPriorityBadge, TaskRepeatMetadata } from "@/presentation/shared/task-metadata";
import { ActionToastStack, ConfirmDeleteDialog, useActionToasts } from "@/presentation/shared/action-feedback";

export type AreaPreviewLocale="ko"|"en";
export type AreaPreviewArea={id:string;title:{ko:string;en:string};color:string;count:number};
export type AreaPreviewProject={id:string;title:{ko:string;en:string};color:string;completed:number;total:number};
export type AreaPreviewTask={
  id:string;title:{ko:string;en:string};goalMinutes:number|null;focusedSeconds?:number;
  priority:SchedulePriority;repeat:"none"|"daily"|"weekly"|"monthly";scheduledDates:string[];schedule:{ko:string;en:string};
};

function Icon({name}:{name:string}) {
  const inline:Record<string,ReactNode>={
    weather:<><circle cx="16.5" cy="7" r="5"/><path d="M3.5 20h11.8a3.7 3.7 0 0 0 .35-7.38A5.1 5.1 0 0 0 6 14.1 3.1 3.1 0 0 0 3.5 20Z"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{inline[name]??<use href={`#i-${name}`}/>}</svg>;
}

const colors=["sky","mint","lilac","peach","butter","rose","coral","teal","navy","gray"];

export function ApprovedAreasPresentation(props:{
  locale:AreaPreviewLocale;onLocaleChange:()=>void;areas:AreaPreviewArea[];
  projects:AreaPreviewProject[];tasks:AreaPreviewTask[];
  navigationBasePath?:string;onSignOut?:()=>void;
  onCreateArea?:(name:string,color:string)=>Promise<void>;onUpdateArea?:(id:string,name:string,color:string)=>Promise<void>;
  onArchiveArea?:(id:string)=>Promise<void>;onDeleteArea?:(id:string)=>Promise<void>;
  onCreateTask?:(form:FormData)=>Promise<void>;onUpdateTask?:(form:FormData)=>Promise<void>;
  onArchiveTask?:(id:string)=>Promise<void>;onDeleteTask?:(id:string)=>Promise<void>;
}) {
  const {locale}=props,router=useRouter();
  const [selectedAreaId,setSelectedAreaId]=useState(props.areas[0]?.id??"");
  const [collapsed,setCollapsed]=useState(false);
  const [modal,setModal]=useState<"new-area"|"edit-area"|"project"|"new-task"|null>(null);
  const [editingTask,setEditingTask]=useState<AreaPreviewTask|null>(null);
  const [openMenu,setOpenMenu]=useState<"area"|string|null>(null);
  const [menuPosition,setMenuPosition]=useState<{left:number;top:number}|null>(null);
  const [projectTab,setProjectTab]=useState<"existing"|"new">("existing");
  const [projectOptionsOpen,setProjectOptionsOpen]=useState(false);
  const [projectQuery,setProjectQuery]=useState("");
  const [selectedColor,setSelectedColor]=useState("sky");
  const [orderedTasks,setOrderedTasks]=useState(props.tasks);
  const [draggingTask,setDraggingTask]=useState<string|null>(null);
  const [deleteTarget,setDeleteTarget]=useState<{id:string;name:string;kind:"area"|"task"}|null>(null);
  const {toasts,notify}=useActionToasts();
  const area=props.areas.find(value=>value.id===selectedAreaId)??props.areas[0];
  const text=locale==="ko"?{
    schedule:"일정",tasks:"작업",areas:"영역",projects:"프로젝트",reports:"리포트",archive:"보관함",search:"검색",language:"한국어",logout:"로그아웃",
    eyebrow:"지속적으로 관리하는 영역",title:"영역",help:"꾸준히 관리할 습관과 관련 프로젝트를 한곳에 모아요.",newArea:"영역 추가",
    project:"프로젝트",direct:"직접 작업",focus:"누적 집중",edit:"수정",store:"보관",remove:"삭제",name:"이름",namePlaceholder:"이름 입력",
    color:"색상",cancel:"취소",create:"만들기",save:"저장",projectHelp:"이 영역에 프로젝트를 연결하거나 새로 만들어요.",
    existing:"기존 프로젝트",newProject:"새 프로젝트",connect:"연결할 프로젝트",choose:"프로젝트를 선택하세요",projectSearch:"프로젝트 검색",
    projectName:"프로젝트 이름",projectPlaceholder:"새 프로젝트 이름",confirm:"확인",
  }:{
    schedule:"Schedule",tasks:"Tasks",areas:"Areas",projects:"Projects",reports:"Reports",archive:"Archive",search:"Search",language:"English",logout:"Log out",
    eyebrow:"AREAS",title:"Areas",help:"Keep ongoing responsibilities and projects together.",newArea:"Add area",
    project:"Projects",direct:"Direct tasks",focus:"Total focus",edit:"Edit",store:"Archive",remove:"Delete",name:"Name",namePlaceholder:"Enter a name",
    color:"Color",cancel:"Cancel",create:"Create",save:"Save",projectHelp:"Connect or create a project for this area.",
    existing:"Existing project",newProject:"New project",connect:"Project to connect",choose:"Choose a project",projectSearch:"Search projects",
    projectName:"Project name",projectPlaceholder:"New project name",confirm:"Confirm",
  };
  const nav=[["calendar","schedule",text.schedule],["checklist","tasks",text.tasks],["grid","areas",text.areas],["folder","projects",text.projects],["chart","reports",text.reports],["archive","archive",text.archive]];
  const options:ScheduleOption[]=props.areas.map(value=>({id:value.id,title:value.title[locale],color:value.color,kind:"area" as const}));
  const taskItem=(task:AreaPreviewTask):ScheduleItem=>({
    id:task.id,taskId:task.id,title:task.title[locale],status:"planned",projectTitle:area?.title[locale]??null,
    locationColor:area?.color??"gray",priority:task.priority,estimatedMinutes:task.goalMinutes,dailyGoalMinutes:task.goalMinutes,
    focusedSeconds:task.focusedSeconds??0,projectId:null,areaId:area?.id??null,repeat:task.repeat,scheduledDates:task.scheduledDates,
  });
  const filteredProjects=useMemo(()=>props.projects.filter(project=>project.title[locale].toLocaleLowerCase().includes(projectQuery.toLocaleLowerCase())),[locale,projectQuery,props.projects]);
  useEffect(()=>{
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setModal(null);setEditingTask(null);setOpenMenu(null);setProjectOptionsOpen(false);}};
    const outside=(event:PointerEvent)=>{
      const target=event.target as Element;
      if(!target.closest("[data-area-menu]"))setOpenMenu(null);
      if(!target.closest("[data-project-select]"))setProjectOptionsOpen(false);
    };
    document.addEventListener("keydown",escape);document.addEventListener("pointerdown",outside);
    return()=>{document.removeEventListener("keydown",escape);document.removeEventListener("pointerdown",outside);};
  },[]);
  const openContextMenu=(event:MouseEvent<HTMLButtonElement>,key:"area"|string)=>{
    const rect=event.currentTarget.getBoundingClientRect();
    setMenuPosition({top:Math.min(window.innerHeight-140,rect.bottom+5),left:Math.max(8,rect.right-170)});
    setOpenMenu(current=>current===key?null:key);
  };
  const dropTask=(event:DragEvent<HTMLElement>,targetId:string)=>{
    event.preventDefault();
    if(!draggingTask||draggingTask===targetId)return setDraggingTask(null);
    setOrderedTasks(current=>{
      const source=current.find(task=>task.id===draggingTask);
      if(!source)return current;
      const without=current.filter(task=>task.id!==draggingTask);
      const targetIndex=without.findIndex(task=>task.id===targetId);
      without.splice(targetIndex<0?without.length:targetIndex,0,source);
      return without;
    });
    setDraggingTask(null);
  };
  const base=props.navigationBasePath??"/ui-preview";
  const hrefFor=(path:string)=>!base&&path==="schedule"?"/":`${base}/${path}`.replace("//","/");
  return <><ApprovedIconSprite/><div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href={hrefFor("schedule")}><span className="brand-mark"><Icon name="weather"/></span><strong>Workday</strong></Link>
      <nav className="main-nav">{nav.map(([icon,path,label])=><button key={path} className={`nav-item ${path==="areas"?"is-active":""}`} type="button" onClick={()=>router.push(hrefFor(path))}><Icon name={icon}/><span>{label}</span></button>)}</nav>
      <button className="search" type="button" onClick={()=>router.push(`${base}/search`.replace("//","/"))}><Icon name="search"/><span>{text.search}</span></button>
      <div className="sidebar-bottom"><button className="utility" type="button" onClick={props.onLocaleChange}><Icon name="globe"/><span>{text.language}</span></button><button className="utility" type="button" onClick={props.onSignOut}><Icon name="logout"/><span>{text.logout}</span></button></div>
    </aside>
    <main className="content"><section className="page is-active">
      <header className="page-head"><div><span className="eyebrow">{text.eyebrow}</span><h1>{text.title}</h1><p>{text.help}</p></div><button className="button primary page-create-button" type="button" onClick={()=>{setSelectedColor("sky");setModal("new-area");}}><Icon name="plus"/><span>{text.newArea}</span></button></header>
      <div className={`workspace ${collapsed?"is-collapsed":""}`}>
        <aside className="rail"><div className="rail-tools"><button className="icon-button collapse-rail" type="button" aria-label={collapsed?(locale==="ko"?"영역 목록 펼치기":"Expand area list"):(locale==="ko"?"영역 목록 접기":"Collapse area list")} onClick={()=>setCollapsed(value=>!value)}><Icon name={collapsed?"panel-expand":"panel-collapse"}/></button></div><nav>{props.areas.map(value=><button type="button" key={value.id} className={value.id===area?.id?"is-active":""} onClick={()=>setSelectedAreaId(value.id)}><span><i className={`dot ${value.color}`}/><b>{value.title[locale]}</b></span><small>{value.count}</small></button>)}</nav></aside>
        <div className="workspace-body">
          <header className="detail-head"><div className="detail-title"><i className={`dot ${area?.color??"gray"}`}/><h2>{area?.title[locale]}</h2></div><div data-area-menu><button className="icon-button menu-trigger" type="button" onClick={event=>openContextMenu(event,"area")}><Icon name="more"/></button>{openMenu==="area"&&<ContextMenu locale={locale} position={menuPosition} onEdit={()=>{setSelectedColor(area?.color??"sky");setModal("edit-area");setOpenMenu(null);}} onArchive={()=>{if(area)void props.onArchiveArea?.(area.id);notify("archive",area?.title[locale]??"");setOpenMenu(null);}} onDelete={()=>{if(area)setDeleteTarget({id:area.id,name:area.title[locale],kind:"area"});setOpenMenu(null);}}/>}</div></header>
          <div className="stats"><article><span>{text.project}</span><strong>{props.projects.length}</strong></article><article><span>{text.direct}</span><strong>{orderedTasks.length}</strong></article><article><span>{text.focus}</span><strong>{locale==="ko"?"12시간 40분":"12h 40m"}</strong></article></div>
          <section className="content-section"><header><h3>{text.project}</h3><button className="text-button" type="button" aria-label={locale==="ko"?"프로젝트 추가":"Add project"} onClick={()=>{setProjectTab("existing");setModal("project");}}><Icon name="plus"/></button></header><div className="project-mini-grid">{props.projects.map(project=><button type="button" key={project.id}><span><strong>{project.title[locale]}</strong><small>{locale==="ko"?`${project.completed} / ${project.total} 완료`:`${project.completed} / ${project.total} complete`}</small></span><Icon name="chevron-right"/></button>)}</div></section>
          <section className="content-section"><header><h3>{text.direct}</h3><button className="text-button" type="button" aria-label={locale==="ko"?"작업 추가":"Add task"} onClick={()=>setModal("new-task")}><Icon name="plus"/></button></header><div className="area-tasks">{orderedTasks.map(task=><article className="sortable-item" key={task.id} onDragOver={event=>event.preventDefault()} onDrop={event=>dropTask(event,task.id)}>
            <span className="list-drag" draggable onDragStart={()=>setDraggingTask(task.id)} onDragEnd={()=>setDraggingTask(null)} role="button" tabIndex={0} aria-label={locale==="ko"?"작업 순서 변경":"Reorder task"}><Icon name="grip"/></span>
            <div className="area-task-copy"><span className="task-title-line"><strong>{task.title[locale]}</strong><TaskPriorityBadge locale={locale} priority={task.priority}/></span><TaskMetadata locale={locale} goalMinutes={task.goalMinutes} trailing={task.repeat!=="none"?<TaskRepeatMetadata locale={locale} repeat={task.repeat}/>:undefined}/></div>
            <div className="area-task-actions"><button className="schedule-button" type="button" onClick={()=>setEditingTask(task)}><Icon name="calendar-days"/><span>{task.schedule[locale]}</span></button><div data-area-menu><button className="icon-button menu-trigger" type="button" onClick={event=>openContextMenu(event,task.id)}><Icon name="more"/></button>{openMenu===task.id&&<ContextMenu locale={locale} position={menuPosition} onEdit={()=>{setEditingTask(task);setOpenMenu(null);}} onArchive={()=>{void props.onArchiveTask?.(task.id);setOrderedTasks(current=>current.filter(value=>value.id!==task.id));notify("archive",task.title[locale]);setOpenMenu(null);}} onDelete={()=>{setDeleteTarget({id:task.id,name:task.title[locale],kind:"task"});setOpenMenu(null);}}/>}</div></div>
          </article>)}</div></section>
        </div>
      </div>
    </section></main>
  </div>
  {(modal==="new-task"||editingTask)&&<ApprovedTaskModal locale={locale} selectedKey={new Date().toISOString().slice(0,10)} todayKey={new Date().toISOString().slice(0,10)} defaultDates={[]} defaultLocation={area?`area:${area.id}`:""} options={options} initial={editingTask?taskItem(editingTask):undefined} onClose={()=>{setModal(null);setEditingTask(null);}} onSubmit={editingTask?(props.onUpdateTask??(async()=>{})):(props.onCreateTask??(async()=>{}))}/>}
  {(modal==="new-area"||modal==="edit-area")&&<SimpleAreaModal locale={locale} edit={modal==="edit-area"} initialName={modal==="edit-area"?area?.title[locale]??"":""} color={selectedColor} onColor={setSelectedColor} onClose={()=>setModal(null)} onSubmit={async(name,color)=>{if(modal==="edit-area"&&area)await props.onUpdateArea?.(area.id,name,color);else await props.onCreateArea?.(name,color);setModal(null);}}/>}
  {modal==="project"&&<ProjectModal locale={locale} tab={projectTab} onTab={setProjectTab} projects={filteredProjects} query={projectQuery} onQuery={setProjectQuery} optionsOpen={projectOptionsOpen} onOptionsOpen={setProjectOptionsOpen} color={selectedColor} onColor={setSelectedColor} onClose={()=>setModal(null)}/>}
  {deleteTarget&&<ConfirmDeleteDialog locale={locale} name={deleteTarget.name} onCancel={()=>setDeleteTarget(null)} onConfirm={()=>{if(deleteTarget.kind==="task"){void props.onDeleteTask?.(deleteTarget.id);setOrderedTasks(current=>current.filter(task=>task.id!==deleteTarget.id));}else void props.onDeleteArea?.(deleteTarget.id);notify("delete",deleteTarget.name);setDeleteTarget(null);}}/>}
  <ActionToastStack locale={locale} toasts={toasts}/>
  </>;
}

function ContextMenu({locale,position,onEdit,onArchive,onDelete}:{locale:AreaPreviewLocale;position:{left:number;top:number}|null;onEdit:()=>void;onArchive:()=>void;onDelete:()=>void}) {
  return <div className="menu popover" style={position??undefined}><button type="button" onClick={onEdit}><Icon name="edit"/><span>{locale==="ko"?"수정":"Edit"}</span></button><button type="button" onClick={onArchive}><Icon name="archive"/><span>{locale==="ko"?"보관":"Archive"}</span></button><button className="danger" type="button" onClick={onDelete}><Icon name="trash"/><span>{locale==="ko"?"삭제":"Delete"}</span></button></div>;
}

function ColorOptions({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  return <div className="color-options">{colors.map(color=><button key={color} className={`${color} ${value===color?"is-active":""}`} type="button" aria-label={color} onClick={()=>onChange(color)}><i/></button>)}</div>;
}

function SimpleAreaModal({locale,edit,initialName,color,onColor,onClose,onSubmit}:{locale:AreaPreviewLocale;edit:boolean;initialName:string;color:string;onColor:(value:string)=>void;onClose:()=>void;onSubmit:(name:string,color:string)=>Promise<void>}) {
  const [name,setName]=useState(initialName);
  return <div className="modal-layer"><button className="modal-backdrop" aria-label="close" onClick={onClose}/><section className="modal small-modal" role="dialog" aria-modal="true"><header><div><h2>{edit?(locale==="ko"?"영역 수정":"Edit area"):(locale==="ko"?"새 영역":"New area")}</h2><p>{locale==="ko"?"이름과 색상을 정해 주세요.":"Choose a name and color."}</p></div><button className="icon-button" type="button" onClick={onClose}><Icon name="x"/></button></header><div className="modal-body"><label className="field"><span>{locale==="ko"?"이름":"Name"}</span><input className="form-input" value={name} onChange={event=>setName(event.target.value)} autoFocus placeholder={locale==="ko"?"이름 입력":"Enter a name"}/></label><fieldset className="field"><legend>{locale==="ko"?"색상":"Color"}</legend><ColorOptions value={color} onChange={onColor}/></fieldset></div><footer><button className="button subtle" type="button" onClick={onClose}>{locale==="ko"?"취소":"Cancel"}</button><button className="button primary" type="button" disabled={!name.trim()} onClick={()=>void onSubmit(name.trim(),color)}>{edit?(locale==="ko"?"저장":"Save"):(locale==="ko"?"만들기":"Create")}</button></footer></section></div>;
}

function ProjectModal(props:{locale:AreaPreviewLocale;tab:"existing"|"new";onTab:(value:"existing"|"new")=>void;projects:AreaPreviewProject[];query:string;onQuery:(value:string)=>void;optionsOpen:boolean;onOptionsOpen:(value:boolean)=>void;color:string;onColor:(value:string)=>void;onClose:()=>void}) {
  const ko=props.locale==="ko";
  return <div className="modal-layer"><button className="modal-backdrop" aria-label="close" onClick={props.onClose}/><section className="modal small-modal" role="dialog" aria-modal="true"><header><div><h2>{ko?"프로젝트":"Project"}</h2><p>{ko?"이 영역에 프로젝트를 연결하거나 새로 만들어요.":"Connect or create a project for this area."}</p></div><button className="icon-button" type="button" onClick={props.onClose}><Icon name="x"/></button></header><div className="modal-body"><div className="tabs modal-tabs"><button className={props.tab==="existing"?"is-active":""} type="button" onClick={()=>props.onTab("existing")}>{ko?"기존 프로젝트":"Existing project"}</button><button className={props.tab==="new"?"is-active":""} type="button" onClick={()=>props.onTab("new")}>{ko?"새 프로젝트":"New project"}</button></div>{props.tab==="existing"?<div className="project-tab is-active"><label className="field" data-project-select><span>{ko?"연결할 프로젝트":"Project to connect"}</span><button className="select-trigger" type="button" onClick={()=>props.onOptionsOpen(!props.optionsOpen)}><b>{ko?"프로젝트를 선택하세요":"Choose a project"}</b><Icon name="chevron-down"/></button>{props.optionsOpen&&<div className="project-options"><label className="menu-search"><Icon name="search"/><input autoFocus value={props.query} onChange={event=>props.onQuery(event.target.value)} placeholder={ko?"프로젝트 검색":"Search projects"}/></label>{props.projects.map(project=><button key={project.id} type="button" onClick={()=>props.onOptionsOpen(false)}><i className={`dot ${project.color}`}/><span>{project.title[props.locale]}</span></button>)}</div>}</label></div>:<div className="project-tab is-active"><label className="field"><span>{ko?"프로젝트 이름":"Project name"}</span><input className="form-input" autoFocus placeholder={ko?"새 프로젝트 이름":"New project name"}/></label><fieldset className="field"><legend>{ko?"색상":"Color"}</legend><ColorOptions value={props.color} onChange={props.onColor}/></fieldset></div>}</div><footer><button className="button subtle" type="button" onClick={props.onClose}>{ko?"취소":"Cancel"}</button><button className="button primary" type="button" onClick={props.onClose}>{ko?"확인":"Confirm"}</button></footer></section></div>;
}
