"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ApprovedIconSprite,
  ApprovedTaskModal,
  type ScheduleItem,
  type ScheduleOption,
  type SchedulePriority,
} from "@/presentation/schedule/schedule-view";
import { TaskMetadata, TaskPriorityBadge, TaskRepeatMetadata } from "@/presentation/shared/task-metadata";
import { ActionToastStack, ConfirmDeleteDialog, useActionToasts } from "@/presentation/shared/action-feedback";

type Locale="ko"|"en";
export type TaskPreviewItem={
  id:string; title:{ko:string;en:string}; category:{ko:string;en:string}; color:string;
  goal:{ko:string;en:string}; repeat?:{ko:string;en:string}; schedule:{ko:string;en:string};
  goalMinutes?:number|null; focusedSeconds?:number|null; priority?:SchedulePriority; repeatValue?:"none"|"daily"|"weekly"|"monthly"; scheduledDates?:string[];
};

function Icon({name}:{name:string}) {
  const paths:Record<string,ReactNode>={
    weather:<><circle cx="16.5" cy="7" r="5"/><path d="M3.5 20h11.8a3.7 3.7 0 0 0 .35-7.38A5.1 5.1 0 0 0 6 14.1 3.1 3.1 0 0 0 3.5 20Z"/></>,
    calendar:<><path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v15H3V6a2 2 0 0 1 2-2Z"/></>,
    tasks:<><path d="m4 6 2 2 3-4m3 3h8M4 13l2 2 3-4m3 3h8M4 20l2 2 3-4m3 3h8"/></>,
    grid:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/></>,
    folder:<><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>,
    chart:<><path d="M4 19V9m6 10V5m6 14v-7m5 7H2"/></>,
    archive:<><path d="M4 7h16v13H4Zm-1-4h18v4H3Zm6 8h6"/></>,
    search:<><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
    globe:<><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4.2" ry="9"/><path d="M3 12h18"/></>,
    logout:<><path d="M10 4H4v16h6m5-4 4-4-4-4m4 4H9"/></>,
    plus:<path d="M12 5v14M5 12h14"/>,
    calendarDays:<><path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v15H3V6a2 2 0 0 1 2-2Z"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
    repeat:<><path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></>,
    more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    edit:<><path d="m14 5 5 5L8 21H3v-5Zm2-2 5 5"/></>,
    trash:<><path d="M4 7h16M9 3h6l1 4H8Zm-3 4 1 14h10l1-14M10 11v6m4-6v6"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export function ApprovedTasksPresentation({locale,onLocaleChange,items,navigationBasePath="/ui-preview",options:providedOptions,onCreateTask,onUpdateTask,onArchiveTask,onDeleteTask,onSignOut,initialTab="inbox",onTabChange}:{locale:Locale;onLocaleChange:()=>void;items:TaskPreviewItem[];navigationBasePath?:string;options?:ScheduleOption[];onCreateTask?:(form:FormData)=>Promise<void>;onUpdateTask?:(form:FormData)=>Promise<void>;onArchiveTask?:(id:string)=>Promise<void>;onDeleteTask?:(id:string)=>Promise<void>;onSignOut?:()=>void;initialTab?:string;onTabChange?:(tab:string)=>void}) {
  const [tab,setTab]=useState(initialTab);
  const [modalItem,setModalItem]=useState<TaskPreviewItem|"new"|null>(null);
  const [openMenu,setOpenMenu]=useState<string|null>(null);
  const [menuPosition,setMenuPosition]=useState<{left:number;top:number}|null>(null);
  const [visibleItems,setVisibleItems]=useState(items);
  const [deleteItem,setDeleteItem]=useState<TaskPreviewItem|null>(null);
  const {toasts,notify}=useActionToasts();
  const router=useRouter();
  const copy=locale==="ko"
    ? {schedule:"일정",tasks:"작업",areas:"영역",projects:"프로젝트",reports:"리포트",archive:"보관함",search:"검색",language:"한국어",logout:"로그아웃",eyebrow:"작업 모음",title:"작업",help:"해야 할 일을 한곳에서 정리해요.",add:"작업 추가",tabs:["수집함","오늘","예정","미정","완료 기록"]}
    : {schedule:"Schedule",tasks:"Tasks",areas:"Areas",projects:"Projects",reports:"Reports",archive:"Archive",search:"Search",language:"English",logout:"Log out",eyebrow:"TASKS",title:"Tasks",help:"Organize everything in one place.",add:"Add task",tabs:["Inbox","Today","Upcoming","Unscheduled","Completed"]};
  const nav=[["calendar","schedule",copy.schedule],["tasks","tasks",copy.tasks],["grid","areas",copy.areas],["folder","projects",copy.projects],["chart","reports",copy.reports],["archive","archive",copy.archive]];
  const tabKeys=["inbox","today","upcoming","unscheduled","completed"];
  const hrefFor=(path:string)=>!navigationBasePath&&path==="schedule"?"/":`${navigationBasePath}/${path}`.replace("//","/");
  const options:ScheduleOption[]=providedOptions??[
    {id:"life",title:locale==="ko"?"생활":"Life",color:"peach",kind:"area"},
    {id:"personal",title:locale==="ko"?"개인 프로젝트":"Personal project",color:"lilac",kind:"project"},
  ];
  const asScheduleItem=(item:TaskPreviewItem):ScheduleItem=>({
    id:item.id,taskId:item.id,title:item.title[locale],status:"planned",
    projectTitle:item.category[locale],locationColor:item.color,
    priority:item.priority??"normal",estimatedMinutes:item.goalMinutes??null,dailyGoalMinutes:item.goalMinutes??null,focusedSeconds:item.focusedSeconds??0,
    projectId:item.category.en==="Personal project"?"personal":null,
    areaId:item.category.en==="Life"?"life":null,
    repeat:item.repeatValue??"none",scheduledDates:item.scheduledDates??[],
  });
  useEffect(()=>{
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpenMenu(null);setModalItem(null);}};
    const outside=(event:PointerEvent)=>{if(!(event.target as Element).closest("[data-task-preview-menu]"))setOpenMenu(null);};
    document.addEventListener("keydown",close);
    document.addEventListener("pointerdown",outside);
    return()=>{document.removeEventListener("keydown",close);document.removeEventListener("pointerdown",outside);};
  },[]);
  const submitTask=async(form:FormData)=>{await (modalItem==="new"?onCreateTask?.(form):onUpdateTask?.(form));};
  return <><ApprovedIconSprite/><div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href={hrefFor("schedule")}><span className="brand-mark"><Icon name="weather"/></span><strong>Workday</strong></Link>
      <nav className="main-nav">{nav.map(([icon,path,label])=><button key={path} className={`nav-item ${path==="tasks"?"is-active":""}`} type="button" onClick={()=>router.push(hrefFor(path))}><Icon name={icon}/><span>{label}</span></button>)}</nav>
      <button className="search" type="button" onClick={()=>router.push(`${navigationBasePath}/search`.replace("//","/"))}><Icon name="search"/><span>{copy.search}</span></button>
      <div className="sidebar-bottom"><button className="utility" type="button" onClick={onLocaleChange}><Icon name="globe"/><span>{copy.language}</span></button><button className="utility" type="button" onClick={onSignOut}><Icon name="logout"/><span>{copy.logout}</span></button></div>
    </aside>
    <main className="content"><section className="page is-active">
      <header className="page-head"><div><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.help}</p></div><button className="button primary page-create-button" type="button" onClick={()=>setModalItem("new")}><Icon name="plus"/><span>{copy.add}</span></button></header>
      <div className="tabs task-filters">{copy.tabs.map((label,index)=><button key={tabKeys[index]} className={tab===tabKeys[index]?"is-active":""} type="button" onClick={()=>{setTab(tabKeys[index]);if(onTabChange)onTabChange(tabKeys[index]);else if(!navigationBasePath)router.push(`/tasks?filter=${tabKeys[index]}`);}}>{label}</button>)}</div>
      <div className="directory-list">{visibleItems.map(item=><article className="directory-row" key={item.id}>
        <span className="directory-leading" aria-hidden="true"/>
        <div><span className="task-title-line"><strong>{item.title[locale]}</strong><TaskPriorityBadge locale={locale} priority={item.priority??"normal"}/></span><TaskMetadata locale={locale} location={item.category[locale]} color={item.color} goalMinutes={item.goalMinutes} trailing={item.repeatValue&&item.repeatValue!=="none"?<TaskRepeatMetadata locale={locale} repeat={item.repeatValue}/>:undefined}/></div>
        <div className="directory-actions">
          <button className="schedule-button" type="button" onClick={()=>setModalItem(item)}><Icon name="calendarDays"/><span>{item.schedule[locale]}</span></button>
          <div data-task-preview-menu><button className="icon-button menu-trigger" type="button" aria-label={locale==="ko"?"작업 메뉴":"Task menu"} onClick={event=>{if(openMenu===item.id){setOpenMenu(null);return;}const rect=event.currentTarget.getBoundingClientRect();setMenuPosition({top:Math.min(window.innerHeight-140,rect.bottom+5),left:Math.max(8,rect.right-170)});setOpenMenu(item.id);}}><Icon name="more"/></button>
          {openMenu===item.id&&<div className="menu popover" style={menuPosition??undefined}><button type="button" onClick={()=>{setModalItem(item);setOpenMenu(null);}}><Icon name="edit"/><span>{locale==="ko"?"수정":"Edit"}</span></button><button type="button" onClick={()=>{void onArchiveTask?.(item.id);setVisibleItems(current=>current.filter(value=>value.id!==item.id));notify("archive",item.title[locale]);setOpenMenu(null);}}><Icon name="archive"/><span>{locale==="ko"?"보관":"Archive"}</span></button><button className="danger" type="button" onClick={()=>{setDeleteItem(item);setOpenMenu(null);}}><Icon name="trash"/><span>{locale==="ko"?"삭제":"Delete"}</span></button></div>}</div>
        </div>
      </article>)}</div>
    </section></main>
  </div>
  {modalItem&&<ApprovedTaskModal locale={locale} selectedKey={new Date().toISOString().slice(0,10)} todayKey={new Date().toISOString().slice(0,10)} defaultDates={[]} options={options} initial={modalItem==="new"?undefined:asScheduleItem(modalItem)} onClose={()=>setModalItem(null)} onSubmit={submitTask}/>}
  {deleteItem&&<ConfirmDeleteDialog locale={locale} name={deleteItem.title[locale]} onCancel={()=>setDeleteItem(null)} onConfirm={()=>{void onDeleteTask?.(deleteItem.id);setVisibleItems(current=>current.filter(item=>item.id!==deleteItem.id));notify("delete",deleteItem.title[locale]);setDeleteItem(null);}}/>}
  <ActionToastStack locale={locale} toasts={toasts}/>
  </>;
}
