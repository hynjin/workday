"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApprovedIconSprite } from "@/presentation/schedule/schedule-view";
import { ActionToastStack, ConfirmDeleteDialog, useActionToasts } from "@/presentation/shared/action-feedback";

export type ArchiveLocale="ko"|"en";
export type ArchivePreviewItem={id:string;kind:"project"|"area"|"task";title:{ko:string;en:string};color:string};

function Icon({name}:{name:string}) {
  const inline:Record<string,ReactNode>={weather:<><circle cx="16.5" cy="7" r="5"/><path d="M3.5 20h11.8a3.7 3.7 0 0 0 .35-7.38A5.1 5.1 0 0 0 6 14.1 3.1 3.1 0 0 0 3.5 20Z"/></>};
  return <svg viewBox="0 0 24 24" aria-hidden="true">{inline[name]??<use href={`#i-${name}`}/>}</svg>;
}

export function ApprovedArchivePresentation({locale,onLocaleChange,initialItems,navigationBasePath="/ui-preview",onRestore,onDelete,onSignOut}:{locale:ArchiveLocale;onLocaleChange:()=>void;initialItems:ArchivePreviewItem[];navigationBasePath?:string;onRestore?:(item:ArchivePreviewItem)=>Promise<void>;onDelete?:(item:ArchivePreviewItem)=>Promise<void>;onSignOut?:()=>void}) {
  const router=useRouter(),[filter,setFilter]=useState<"all"|"project"|"area"|"task">("all"),[items,setItems]=useState(initialItems);
  const [deleteItem,setDeleteItem]=useState<ArchivePreviewItem|null>(null);
  const {toasts,notify}=useActionToasts();
  const t=locale==="ko"?{
    schedule:"일정",tasks:"작업",areas:"영역",projects:"프로젝트",reports:"리포트",archive:"보관함",search:"검색",language:"한국어",logout:"로그아웃",
    eyebrow:"보관한 항목",title:"보관함",help:"보관한 프로젝트, 영역, 작업을 다시 확인해요.",all:"전체",restore:"복원",remove:"삭제",empty:"보관된 항목이 없어요",
  }:{
    schedule:"Schedule",tasks:"Tasks",areas:"Areas",projects:"Projects",reports:"Reports",archive:"Archive",search:"Search",language:"English",logout:"Log out",
    eyebrow:"ARCHIVE",title:"Archive",help:"Review archived projects, areas, and tasks.",all:"All",restore:"Restore",remove:"Delete",empty:"No archived items",
  };
  const nav=[["calendar","schedule",t.schedule],["checklist","tasks",t.tasks],["grid","areas",t.areas],["folder","projects",t.projects],["chart","reports",t.reports],["archive","archive",t.archive]];
  const hrefFor=(path:string)=>!navigationBasePath&&path==="schedule"?"/":`${navigationBasePath}/${path}`.replace("//","/");
  const tabs:[typeof filter,string][]=[["all",t.all],["project",t.projects],["area",t.areas],["task",t.tasks]];
  const visible=items.filter(item=>filter==="all"||item.kind===filter);
  const groups=[
    {key:"project",title:t.projects,items:visible.filter(item=>item.kind==="project")},
    {key:"area",title:t.areas,items:visible.filter(item=>item.kind==="area")},
    {key:"task",title:t.tasks,items:visible.filter(item=>item.kind==="task")},
  ].filter(group=>group.items.length);
  const dismiss=async(item:ArchivePreviewItem,kind:"restore"|"delete")=>{await (kind==="restore"?onRestore?.(item):onDelete?.(item));setItems(current=>current.filter(value=>value.id!==item.id));notify(kind,item.title[locale]);};
  return <><ApprovedIconSprite/><div className="app-shell"><aside className="sidebar">
    <Link className="brand" href={hrefFor("schedule")}><span className="brand-mark"><Icon name="weather"/></span><strong>Workday</strong></Link>
    <nav className="main-nav">{nav.map(([icon,path,label])=><button key={path} className={`nav-item ${path==="archive"?"is-active":""}`} type="button" onClick={()=>router.push(hrefFor(path))}><Icon name={icon}/><span>{label}</span></button>)}</nav>
    <button className="search" type="button" onClick={()=>router.push(`${navigationBasePath}/search`.replace("//","/"))}><Icon name="search"/><span>{t.search}</span></button><div className="sidebar-bottom"><button className="utility" type="button" onClick={onLocaleChange}><Icon name="globe"/><span>{t.language}</span></button><button className="utility" type="button" onClick={onSignOut}><Icon name="logout"/><span>{t.logout}</span></button></div>
  </aside><main className="content"><section className="page is-active">
    <header className="page-head"><div><span className="eyebrow">{t.eyebrow}</span><h1>{t.title}</h1><p>{t.help}</p></div></header>
    <div className="tabs archive-tabs">{tabs.map(([key,label])=><button className={filter===key?"is-active":""} type="button" key={key} onClick={()=>setFilter(key)}>{label}</button>)}</div>
    {groups.length?groups.map(group=><section className="archive-group" key={group.key}><h2>{group.title}</h2>{group.items.map(item=><article className="archive-row" key={item.id}><span><i className={`dot ${item.color}`}/><b>{item.title[locale]}</b></span><div><button type="button" onClick={()=>void dismiss(item,"restore")}>{t.restore}</button><button className="danger" type="button" onClick={()=>setDeleteItem(item)}>{t.remove}</button></div></article>)}</section>):<div className="archive-empty"><span><Icon name="archive"/></span><strong>{t.empty}</strong></div>}
  </section></main></div>{deleteItem&&<ConfirmDeleteDialog locale={locale} name={deleteItem.title[locale]} onCancel={()=>setDeleteItem(null)} onConfirm={()=>{void dismiss(deleteItem,"delete");setDeleteItem(null);}}/>}<ActionToastStack locale={locale} toasts={toasts}/></>;
}
