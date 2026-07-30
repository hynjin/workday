"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

type Locale="ko"|"en";
type TaskPreviewItem={
  id:string; title:{ko:string;en:string}; category:{ko:string;en:string}; color:string;
  goal:{ko:string;en:string}; repeat?:{ko:string;en:string}; schedule:{ko:string;en:string};
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
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export function ApprovedTasksPresentation({locale,onLocaleChange,items}:{locale:Locale;onLocaleChange:()=>void;items:TaskPreviewItem[]}) {
  const [tab,setTab]=useState("inbox");
  const router=useRouter();
  const copy=locale==="ko"
    ? {schedule:"일정",tasks:"작업",areas:"영역",projects:"프로젝트",reports:"리포트",archive:"보관함",search:"검색",language:"한국어",logout:"로그아웃",eyebrow:"작업 모음",title:"작업",help:"해야 할 일을 한곳에서 정리해요.",add:"작업 추가",tabs:["수집함","오늘","예정","미정","완료 기록"]}
    : {schedule:"Schedule",tasks:"Tasks",areas:"Areas",projects:"Projects",reports:"Reports",archive:"Archive",search:"Search",language:"English",logout:"Log out",eyebrow:"TASKS",title:"Tasks",help:"Organize everything in one place.",add:"Add task",tabs:["Inbox","Today","Upcoming","Unscheduled","Completed"]};
  const nav=[["calendar","schedule",copy.schedule],["tasks","tasks",copy.tasks],["grid","areas",copy.areas],["folder","projects",copy.projects],["chart","reports",copy.reports],["archive","archive",copy.archive]];
  const tabKeys=["inbox","today","upcoming","unscheduled","completed"];
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/ui-preview/schedule"><span className="brand-mark"><Icon name="weather"/></span><strong>Workday</strong></Link>
      <nav className="main-nav">{nav.map(([icon,path,label])=><button key={path} className={`nav-item ${path==="tasks"?"is-active":""}`} type="button" onClick={()=>router.push(`/ui-preview/${path}`)}><Icon name={icon}/><span>{label}</span></button>)}</nav>
      <button className="search" type="button"><Icon name="search"/><span>{copy.search}</span></button>
      <div className="sidebar-bottom"><button className="utility" type="button" onClick={onLocaleChange}><Icon name="globe"/><span>{copy.language}</span></button><button className="utility" type="button"><Icon name="logout"/><span>{copy.logout}</span></button></div>
    </aside>
    <main className="content"><section className="page is-active">
      <header className="page-head"><div><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.help}</p></div><button className="button primary page-create-button"><Icon name="plus"/><span>{copy.add}</span></button></header>
      <div className="tabs task-filters">{copy.tabs.map((label,index)=><button key={tabKeys[index]} className={tab===tabKeys[index]?"is-active":""} type="button" onClick={()=>setTab(tabKeys[index])}>{label}</button>)}</div>
      <div className="directory-list">{items.map(item=><article className="directory-row" key={item.id}><div><strong>{item.title[locale]}</strong><small><i className={`dot ${item.color}`}/><span>{item.category[locale]}</span><span aria-hidden="true">·</span><span>{item.goal[locale]}</span>{item.repeat&&<span className="repeat-meta"><Icon name="repeat"/><span>{item.repeat[locale]}</span></span>}</small></div><div><button className="schedule-button" type="button"><Icon name="calendarDays"/><span>{item.schedule[locale]}</span></button><button className="icon-button" type="button" aria-label={locale==="ko"?"작업 메뉴":"Task menu"}><Icon name="more"/></button></div></article>)}</div>
    </section></main>
  </div>;
}

export type {TaskPreviewItem};
