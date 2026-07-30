"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";

// These names are the approved class names from ui/index.html.  Keeping this
// mapping literal lets the preview and production adapters share this exact
// presentation without CSS-module rewriting.
const styles: Record<string, string> = {
  root: "", shell: "app-shell", sidebar: "sidebar", brand: "brand",
  brandMark: "brand-mark", nav: "main-nav", navItem: "nav-item",
  navItemActive: "is-active", search: "search", sidebarBottom: "sidebar-bottom",
  utility: "utility", content: "content", pageHead: "page-head",
  eyebrow: "eyebrow", actions: "schedule-actions", button: "button",
  primary: "primary", todayButton: "calendar-today-button",
  scheduleGrid: "schedule-grid", notice: "notice", daySummary: "day-summary",
  progress: "progress", sectionTitle: "section-title", taskList: "task-list schedule-tasks sortable-list",
  taskRow: "task-row sortable-item", complete: "is-complete", drag: "list-drag",
  checkbox: "checkbox", taskMain: "task-main start-focus", dot: "dot",
  sky: "sky", mint: "mint", lilac: "lilac", peach: "peach", butter: "butter",
  gray: "gray", play: "focus-arrow", priority: "priority", low: "low",
  normal: "normal", high: "high", more: "task-menu", iconButton: "icon-button",
  menu: "menu", danger: "danger", empty: "schedule-empty", emptyIcon: "",
  calendar: "calendar-card", calendarGrid: "calendar-grid", selected: "is-selected",
  today: "is-today", recorded: "is-recorded", modalLayer: "modal-layer",
  backdrop: "modal-backdrop", modal: "modal", modalBody: "modal-body",
  taskModal: "task-modal",
  searchModal: "search-modal", titleInput: "title-input", field: "field",
  fieldHead: "field-head", fieldLabel: "", selectTrigger: "select-trigger",
  selectMenu: "select-menu", estimate: "estimate-fields", switch: "switch",
  priorityOptions: "priority-options", prioritySelected: "is-active",
  scheduleMenu: "is-floating", scheduleSummary: "schedule-summary",
  searchField: "global-search-field", results: "search-results", result: "",
  searchEmpty: "search-empty",
};

export type ScheduleLocale = "ko" | "en";
export type SchedulePriority = "low" | "normal" | "high";
export type ScheduleItem = {
  id:string; taskId:string|null; title:string; status:"planned"|"completed"; projectTitle:string|null; locationColor:string;
  priority:SchedulePriority; estimatedMinutes:number|null; dailyGoalMinutes:number|null;
  projectId:string|null; areaId:string|null; repeat:"none"|"daily"|"weekly"|"monthly";
  scheduledDates?:string[];
};
export type ScheduleDay = { key:string; hasWorkday:boolean; selected:boolean; today:boolean };
export type ScheduleOption = { id:string; title:string; color:string; kind:"project"|"area" };
export type ScheduleSearchItem = { id:string; title:string; color:string; kind:"task"|"project"|"area"; meta:string; href:string };
type FormAction = (formData:FormData) => Promise<void>;
type Locale = ScheduleLocale;
type Priority = SchedulePriority;
type Item = ScheduleItem;
type Day = ScheduleDay;
type Option = ScheduleOption;
type SearchItem = ScheduleSearchItem;

const labels = {
  ko:{ schedule:"일정",tasks:"작업",areas:"영역",projects:"프로젝트",reports:"리포트",archive:"보관함",search:"검색",language:"한국어",logout:"로그아웃",newTask:"새 작업",today:"오늘로 이동",flow:"오늘의 흐름",tasksFor:"이 날짜의 작업",recorded:"기록 있음",empty:"이 날짜에는 예정된 작업이 없어요",emptyHelp:"새 작업을 추가하거나 다른 날짜를 선택해 보세요.",selectTask:"작업을 누르면 집중을 시작해요.",review:"이 날짜에 예정된 작업을 확인해요.",done:"완료",noEstimate:"목표 시간 없음",low:"낮음",normal:"보통",high:"높음",edit:"수정",remove:"이 날짜에서 빼기",newTitle:"새 작업",newHelp:"필요한 항목만 빠르게 설정하세요.",taskName:"무엇을 해야 하나요?",classification:"분류",inbox:"수집함",estimate:"목표 시간",notSet:"설정 안 함",setTime:"시간 설정",hour:"시간",minute:"분",priority:"우선순위",scheduleField:"일정",repeat:"반복",noRepeat:"반복 없음",daily:"매일",weekly:"매주",monthly:"매월",cancel:"취소",add:"작업 추가",searchHelp:"작업, 프로젝트, 영역을 한 번에 찾아요.",searchPlaceholder:"검색어를 입력하세요",noResults:"검색 결과가 없어요",undo:"실행 취소"},
  en:{ schedule:"Schedule",tasks:"Tasks",areas:"Areas",projects:"Projects",reports:"Reports",archive:"Archive",search:"Search",language:"English",logout:"Log out",newTask:"New task",today:"Go to today",flow:"Today's flow",tasksFor:"Tasks for this date",recorded:"Recorded",empty:"No tasks are scheduled for this date",emptyHelp:"Add a task or choose another date.",selectTask:"Select a task to start focusing.",review:"Review the tasks scheduled for this date.",done:"Done",noEstimate:"No goal time",low:"Low",normal:"Normal",high:"High",edit:"Edit",remove:"Remove from this date",newTitle:"New task",newHelp:"Set only what you need.",taskName:"What needs to be done?",classification:"Location",inbox:"Inbox",estimate:"Goal time",notSet:"Not set",setTime:"Set time",hour:"h",minute:"m",priority:"Priority",scheduleField:"Schedule",repeat:"Repeat",noRepeat:"No repeat",daily:"Daily",weekly:"Weekly",monthly:"Monthly",cancel:"Cancel",add:"Add task",searchHelp:"Find tasks, projects, and areas at once.",searchPlaceholder:"Type to search",noResults:"No results found",undo:"Undo"},
};

function flowStateCopy(total:number,completed:number) {
  if(!total)return {percent:0,percentLabel:"—",ko:"오늘은 예정된 작업이 없어요",en:"No tasks are scheduled for today",emoji:"🌙"};
  const percent=Math.round(completed/total*100);
  if(percent===0)return {percent,percentLabel:"0%",ko:"아직 시작 전이에요",en:"Not started yet",emoji:"🌧️"};
  if(percent<40)return {percent,percentLabel:`${percent}%`,ko:"천천히 흐름을 만들고 있어요",en:"Building momentum slowly",emoji:"☁️"};
  if(percent<70)return {percent,percentLabel:`${percent}%`,ko:"좋은 흐름을 이어가고 있어요",en:"Keeping up a good flow",emoji:"🌥️"};
  if(percent<100)return {percent,percentLabel:`${percent}%`,ko:"거의 다 왔어요",en:"Almost there",emoji:"🌤️"};
  return {percent,percentLabel:"100%",ko:"오늘의 작업을 모두 마쳤어요",en:"All of today's tasks are complete",emoji:"☀️"};
}

function Icon({ name, size=18 }: { name:string; size?:number }) {
  const ids:Record<string,string>={tasks:"checklist",weather:"partly-sunny",close:"x",chevronLeft:"chevron-left",chevronRight:"chevron-right",chevronDown:"chevron-down"};
  return <svg width={size} height={size} aria-hidden="true"><use href={`#i-${ids[name]??name}`}/></svg>;
}

function ApprovedIconSprite() {
  return <svg className="svg-sprite" aria-hidden="true">
    <symbol id="i-cloud" viewBox="0 0 24 24"><path d="M12 2v2m7.1.9-1.4 1.4M22 12h-2M4.9 4.9l1.4 1.4M2 12h2m2.5 7h11a4.5 4.5 0 0 0 .7-8.95A6.5 6.5 0 0 0 5.7 8.6 4.8 4.8 0 0 0 6.5 19Z"/></symbol>
    <symbol id="i-partly-sunny" viewBox="0 0 24 24"><circle cx="16.5" cy="7" r="5"/><path d="M16.5.5v1.2m0 10.6v1.2M23 7h-1.2M11.9 2.4l.9.9m7.4 7.4.9.9m0-9.2-.9.9"/><path d="M3.5 20h11.8a3.7 3.7 0 0 0 .35-7.38A5.1 5.1 0 0 0 6 14.1 3.1 3.1 0 0 0 3.5 20Z" fill="var(--sky)" stroke="var(--sky)" strokeWidth="4"/><path d="M3.5 20h11.8a3.7 3.7 0 0 0 .35-7.38A5.1 5.1 0 0 0 6 14.1 3.1 3.1 0 0 0 3.5 20Z"/></symbol>
    <symbol id="i-moon" viewBox="0 0 24 24"><path transform="translate(24 0) scale(-1 1)" d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.7 8.7 0 1 0 20.5 15.2Z"/></symbol>
    <symbol id="i-calendar" viewBox="0 0 24 24"><path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v15H3V6a2 2 0 0 1 2-2Z"/><path d="m9 16 2 2 4-5"/></symbol>
    <symbol id="i-calendar-days" viewBox="0 0 24 24"><path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v15H3V6a2 2 0 0 1 2-2Z"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></symbol>
    <symbol id="i-calendar-off" viewBox="0 0 24 24"><path d="M8 2v4m8-4v4M3 10h7m4 0h7M5 4h14a2 2 0 0 1 2 2v11M3 6v15h14"/><path d="m3 3 18 18"/></symbol>
    <symbol id="i-checklist" viewBox="0 0 24 24"><path d="m4 6 2 2 3-4m3 3h8M4 13l2 2 3-4m3 3h8M4 20l2 2 3-4m3 3h8"/></symbol>
    <symbol id="i-grid" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/></symbol>
    <symbol id="i-folder" viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></symbol>
    <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 19V9m6 10V5m6 14v-7m5 7H2"/></symbol>
    <symbol id="i-archive" viewBox="0 0 24 24"><path d="M4 7h16v13H4Zm-1-4h18v4H3Zm6 8h6"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></symbol>
    <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4.2" ry="9"/><path d="M3 12h18"/></symbol>
    <symbol id="i-logout" viewBox="0 0 24 24"><path d="M10 4H4v16h6m5-4 4-4-4-4m4 4H9"/></symbol>
    <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></symbol>
    <symbol id="i-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></symbol>
    <symbol id="i-chevron-left" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>
    <symbol id="i-undo" viewBox="0 0 24 24"><path d="m9 7-5 5 5 5"/><path d="M20 17a7 7 0 0 0-7-7H4"/></symbol>
    <symbol id="i-chevron-right" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
    <symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
    <symbol id="i-play" viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"/></symbol>
    <symbol id="i-grip" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></symbol>
    <symbol id="i-x" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></symbol>
    <symbol id="i-edit" viewBox="0 0 24 24"><path d="m14 5 5 5L8 21H3v-5Zm2-2 5 5"/></symbol>
    <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 3h6l1 4H8Zm-3 4 1 14h10l1-14M10 11v6m4-6v6"/></symbol>
  </svg>;
}

export function ApprovedSchedulePresentation(props:{
  locale:Locale; selectedKey:string; todayKey:string; monthKey:string; monthLabel:string; monthOffset:number;
  previousMonth:string; nextMonth:string; title:string; eyebrow:string; items:Item[]; days:Day[];
  totalSeconds:number; actionable:boolean; removedItemId?:string; options:Option[]; searchItems:SearchItem[];
  onComplete:FormAction; onStartFocus:FormAction; onRemove:FormAction; onUndoRemove:FormAction;
  onCreateTask:FormAction; onUpdateTask:FormAction; onDeleteTask:FormAction; onArchiveTask:FormAction; onReorder:(itemId:string,targetIndex:number)=>Promise<void>;
  onLocaleChange:(locale:Locale)=>Promise<void>; onSignOut:()=>Promise<void>;
  onSelectDate?:(date:string)=>void; onSelectMonth?:(month:string)=>void;
  recordedFocusSeconds?:number;
  refreshAfterLocaleChange?:boolean;
  refreshAfterMutation?:boolean;
}) {
  const t=labels[props.locale], router=useRouter();
  const [taskModal,setTaskModal]=useState(false), [searchModal,setSearchModal]=useState(false);
  const [editingItem,setEditingItem]=useState<Item|null>(null);
  const [openMenu,setOpenMenu]=useState<string|null>(null),[menuPosition,setMenuPosition]=useState<{left:number;top:number}|null>(null), [pending,startTransition]=useTransition();
  const [pointerDrag,setPointerDrag]=useState<string|null>(null);
  const dragItem=useRef<string|null>(null);
  useEffect(()=>{document.documentElement.lang=props.locale;},[props.locale]);
  useEffect(()=>{
    const escape=(event:KeyboardEvent)=>{ if(event.key==="Escape"){setTaskModal(false);setSearchModal(false);setOpenMenu(null);} };
    const outside=(event:PointerEvent)=>{ if(!(event.target as Element).closest("[data-schedule-menu]")) setOpenMenu(null); };
    document.addEventListener("keydown",escape); document.addEventListener("pointerdown",outside);
    return()=>{document.removeEventListener("keydown",escape);document.removeEventListener("pointerdown",outside);};
  },[]);
  const done=props.items.filter(item=>item.status==="completed").length;
  const isToday=props.selectedKey===props.todayKey,isPast=props.selectedKey<props.todayKey;
  const completionPercent=props.items.length?Math.round(done/props.items.length*100):0;
  const todayFlow=flowStateCopy(props.items.length,done);
  const dateResult=isPast
    ? (props.locale==="ko"?`${props.items.length}개 중 ${done}개 완료 · ${completionPercent}%`:`${done} of ${props.items.length} complete · ${completionPercent}%`)
    : (props.locale==="ko"?`예정 작업 ${props.items.length}개`:`${props.items.length} scheduled ${props.items.length===1?"task":"tasks"}`);
  const nav=[["calendar","/",t.schedule],["tasks","/tasks",t.tasks],["grid","/areas",t.areas],["folder","/projects",t.projects],["chart","/growth",t.reports],["archive","/archive",t.archive]];
  const drop=(event:DragEvent,index:number)=>{event.preventDefault();const id=dragItem.current;dragItem.current=null;if(id)startTransition(async()=>{await props.onReorder(id,index);if(props.refreshAfterMutation!==false)router.refresh();});};
  const runItemAction=(action:FormAction,itemId:string)=>startTransition(async()=>{
    const formData=new FormData();
    formData.set("itemId",itemId);
    await action(formData);
    if(props.refreshAfterMutation!==false)router.refresh();
  });
  return <div className={styles.root}><ApprovedIconSprite/><div className={styles.shell}>
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href="/"><span className={styles.brandMark}><Icon name="weather"/></span><strong>Workday</strong></Link>
      <nav className={styles.nav}>{nav.map(([icon,href,label],index)=><button key={href} className={`${styles.navItem} ${index===0?styles.navItemActive:""}`} type="button" onClick={()=>router.push(href)}><Icon name={icon}/><span>{label}</span></button>)}</nav>
      <button className={styles.search} type="button" onClick={()=>setSearchModal(true)}><Icon name="search"/><span>{t.search}</span></button>
      <div className={styles.sidebarBottom}>
        <button className={styles.utility} type="button" onClick={()=>startTransition(async()=>{await props.onLocaleChange(props.locale==="ko"?"en":"ko");if(props.refreshAfterLocaleChange!==false)router.refresh();})}><Icon name="globe"/><span>{t.language}</span></button>
        <button className={styles.utility} type="button" onClick={()=>startTransition(props.onSignOut)}><Icon name="logout"/><span>{t.logout}</span></button>
      </div>
    </aside>
    <main className={styles.content}>
      <header className={styles.pageHead}><div><span className={styles.eyebrow}>{props.eyebrow}</span><h1>{props.title}</h1><p>{isToday?t.selectTask:dateResult}</p></div>
        <div className={styles.actions}><button className={`${styles.button} ${styles.primary} page-create-button schedule-action-button`} type="button" onClick={()=>setTaskModal(true)}><Icon name="plus"/><span>{t.newTask}</span></button>{props.selectedKey!==props.todayKey&&(props.onSelectDate?<button className={`${styles.button} ${styles.todayButton} schedule-action-button`} type="button" onClick={()=>props.onSelectDate?.(props.todayKey)}><Icon name="calendar"/><span>{t.today}</span></button>:<Link className={`${styles.button} ${styles.todayButton} schedule-action-button`} href="/"><Icon name="calendar"/><span>{t.today}</span></Link>)}</div>
      </header>
      <div className={styles.scheduleGrid}><div>
        {props.removedItemId&&<aside className={styles.notice}><span>{props.locale==="ko"?"이 날짜의 작업에서 제거했어요. 작업과 기록은 유지됩니다.":"Removed from this date. The task and its history are preserved."}</span><form action={props.onUndoRemove}><input type="hidden" name="itemId" value={props.removedItemId}/><button>{t.undo}</button></form></aside>}
        {isToday&&<article className={styles.daySummary}><div><strong>{t.flow}</strong><span>{props.locale==="ko"?(props.items.length?`${props.items.length}개 중 ${done}개 완료 · ${todayFlow.ko} ${todayFlow.emoji}`:`${todayFlow.ko} ${todayFlow.emoji}`):(props.items.length?`${done} of ${props.items.length} complete · ${todayFlow.en} ${todayFlow.emoji}`:`${todayFlow.en} ${todayFlow.emoji}`)}</span></div><div className="flow-progress"><div className={styles.progress}><i style={{width:`${todayFlow.percent}%`}}/></div><b className="flow-percent">{todayFlow.percentLabel}</b></div></article>}
        <div className={styles.sectionTitle}><h2>{t.tasksFor}</h2><span>{props.items.length}</span></div>
        {props.items.length?<div className={styles.taskList} aria-busy={pending}>{props.items.map((item,index)=><article key={item.id} draggable={false} className={`${styles.taskRow} ${item.status==="completed"?styles.complete:""}`} onDragOver={event=>props.actionable&&event.preventDefault()} onDrop={event=>props.actionable&&drop(event,index)} onPointerUp={()=>{if(pointerDrag&&pointerDrag!==item.id){startTransition(async()=>{await props.onReorder(pointerDrag,index);if(props.refreshAfterMutation!==false)router.refresh();});}setPointerDrag(null);}}>
          <span className={styles.drag} draggable={props.actionable} tabIndex={props.actionable?0:undefined} role={props.actionable?"button":undefined} onPointerDown={()=>props.actionable&&setPointerDrag(item.id)} onDragStart={event=>{if(!props.actionable)return;dragItem.current=item.id;event.dataTransfer.effectAllowed="move";}} aria-label={props.locale==="ko"?"작업 순서 변경":"Reorder task"}><Icon name="grip" size={14}/></span>
          {props.actionable?<form action={props.onComplete}><input type="hidden" name="itemId" value={item.id}/><button className={styles.checkbox} aria-label={item.status==="completed"?(props.locale==="ko"?"완료 취소":"Undo completion"):(props.locale==="ko"?"완료":"Complete")}>{item.status==="completed"&&<Icon name="check" size={14}/>}</button></form>:<span/>}
          <button className={styles.taskMain} type="button" disabled={!props.actionable||item.status==="completed"} onClick={()=>runItemAction(props.onStartFocus,item.id)}><strong>{item.title}</strong><small><i className={`${styles.dot} ${styles[item.locationColor]??styles.gray}`}/><span>{item.projectTitle??t.inbox}</span><span aria-hidden="true">·</span><span>{item.status==="completed"?t.done:item.dailyGoalMinutes?formatMinutes(item.dailyGoalMinutes,props.locale):t.noEstimate}</span></small></button>
          <button className={styles.play} type="button" disabled={!props.actionable||item.status==="completed"} aria-label={props.locale==="ko"?"집중 시작":"Start focus"} onClick={()=>runItemAction(props.onStartFocus,item.id)}><Icon name="play"/></button>
          <span className={`${styles.priority} ${styles[item.priority]}`}>{t[item.priority]}</span>
          <div className={styles.more} data-schedule-menu><button className={`${styles.iconButton} menu-trigger`} type="button" aria-label={props.locale==="ko"?"작업 메뉴":"Task menu"} onClick={event=>{if(openMenu===item.id){setOpenMenu(null);return;}const rect=event.currentTarget.getBoundingClientRect();setMenuPosition({top:Math.min(window.innerHeight-130,rect.bottom+5),left:Math.max(8,rect.right-170)});setOpenMenu(item.id);}}><Icon name="more"/></button>{openMenu===item.id&&<div className={`${styles.menu} popover`} style={menuPosition??undefined}>{item.taskId&&<button type="button" onClick={()=>{setEditingItem(item);setOpenMenu(null);}}><Icon name="edit"/><span>{t.edit}</span></button>}<button type="button" onClick={()=>{if(item.taskId)runItemAction(props.onArchiveTask,item.taskId);setOpenMenu(null);}}><Icon name="archive"/><span>{props.locale==="ko"?"보관":"Archive"}</span></button><button type="button" className={styles.danger} onClick={()=>{runItemAction(props.onDeleteTask,item.id);setOpenMenu(null);}}><Icon name="trash"/><span>{props.locale==="ko"?"삭제":"Delete"}</span></button></div>}</div>
        </article>)}</div>:<><div className={styles.taskList}/><div className={styles.empty}><span className={styles.emptyIcon}><Icon name="moon"/></span><strong>{t.empty}</strong><small>{t.emptyHelp}</small></div></>}
      </div><Calendar {...props}/></div>
    </main>
    {taskModal&&<TaskModal locale={props.locale} selectedKey={props.selectedKey} todayKey={props.todayKey} options={props.options} onClose={()=>setTaskModal(false)} onSubmit={props.onCreateTask}/>}
    {editingItem&&<TaskModal locale={props.locale} selectedKey={props.selectedKey} todayKey={props.todayKey} options={props.options} initial={editingItem} onClose={()=>setEditingItem(null)} onSubmit={props.onUpdateTask}/>}
    {searchModal&&<SearchModal locale={props.locale} items={props.searchItems} onClose={()=>setSearchModal(false)}/>}
    {props.recordedFocusSeconds!==undefined&&<div className="focus-toast-stack" aria-live="polite" aria-atomic="false"><div className="focus-toast is-visible" role="status"><span><Icon name="check"/></span><div><strong>{props.locale==="ko"?"집중 시간이 기록됐어요":"Focus time recorded"}</strong><small>{focusRecordedMessage(props.recordedFocusSeconds,props.locale)}</small></div></div></div>}
  </div></div>;
}

function Calendar(props:{locale:Locale;monthKey:string;monthLabel:string;monthOffset:number;previousMonth:string;nextMonth:string;days:Day[];onSelectDate?:(date:string)=>void;onSelectMonth?:(month:string)=>void}) {
  const weekdays=props.locale==="ko"?["일","월","화","수","목","금","토"]:["S","M","T","W","T","F","S"];
  return <aside className={styles.calendar}><header>{props.onSelectMonth?<button className={styles.iconButton} type="button" onClick={()=>props.onSelectMonth?.(props.previousMonth)} aria-label="previous"><Icon name="chevronLeft"/></button>:<Link className={styles.iconButton} href={`/?month=${props.previousMonth}`} aria-label="previous"><Icon name="chevronLeft"/></Link>}<strong>{props.monthLabel}</strong>{props.onSelectMonth?<button className={styles.iconButton} type="button" onClick={()=>props.onSelectMonth?.(props.nextMonth)} aria-label="next"><Icon name="chevronRight"/></button>:<Link className={styles.iconButton} href={`/?month=${props.nextMonth}`} aria-label="next"><Icon name="chevronRight"/></Link>}</header><div className={styles.calendarGrid}>{weekdays.map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}{Array.from({length:props.monthOffset},(_,index)=><span key={`blank-${index}`}/>)}{props.days.map(day=>props.onSelectDate?<button type="button" onClick={()=>props.onSelectDate?.(day.key)} key={day.key} className={`${day.selected?styles.selected:""} ${day.today?styles.today:""} ${day.hasWorkday?styles.recorded:""}`}>{Number(day.key.slice(-2))}</button>:<Link href={`/?date=${day.key}&month=${props.monthKey}`} key={day.key} className={`${day.selected?styles.selected:""} ${day.today?styles.today:""} ${day.hasWorkday?styles.recorded:""}`}>{Number(day.key.slice(-2))}</Link>)}</div><footer><span><i className={`${styles.dot} ${styles.sky}`}/><b>{props.locale==="ko"?"기록 있음":"Recorded"}</b></span></footer></aside>;
}

function TaskModal({locale,selectedKey,todayKey,options,initial,onClose,onSubmit}:{locale:Locale;selectedKey:string;todayKey:string;options:Option[];initial?:Item;onClose:()=>void;onSubmit:FormAction}) {
  const t=labels[locale]; const [title,setTitle]=useState(initial?.title??""),[location,setLocation]=useState(initial?.projectId?`project:${initial.projectId}`:initial?.areaId?`area:${initial.areaId}`:""),[locationQuery,setLocationQuery]=useState(""),[estimate,setEstimate]=useState(initial?.estimatedMinutes!=null),[hours,setHours]=useState(Math.floor((initial?.estimatedMinutes??30)/60)),[minutes,setMinutes]=useState((initial?.estimatedMinutes??30)%60),[priority,setPriority]=useState<Priority>(initial?.priority??"normal"),[repeat,setRepeat]=useState(initial?.repeat??"none"),[scheduleDates,setScheduleDates]=useState<string[]>(initial?.scheduledDates??[]),[open,setOpen]=useState<"location"|"repeat"|"schedule"|null>(null),[floatingRect,setFloatingRect]=useState<{left:number;top:number;width:number}|null>(null),[scheduleAnchor,setScheduleAnchor]=useState<HTMLButtonElement|null>(null),[pending,startTransition]=useTransition();
  const locationTrigger=useRef<HTMLButtonElement|null>(null),repeatTrigger=useRef<HTMLButtonElement|null>(null);
  const selected=options.find(option=>`${option.kind}:${option.id}`===location);
  const visibleOptions=options.filter(option=>option.title.toLocaleLowerCase().includes(locationQuery.toLocaleLowerCase()));
  const multipleDates=scheduleDates.length>1;
  const repeatConflict=repeat!=="none"&&multipleDates;
  const repeatNeedsDate=repeat!=="none"&&!scheduleDates.length;
  const openFloating=(kind:"location"|"repeat",trigger:HTMLButtonElement|null)=>{
    if(open===kind){setOpen(null);return;}
    const rect=trigger?.getBoundingClientRect();
    if(rect){
      const menuHeight=kind==="location"?188:176;
      const below=rect.bottom+6;
      setFloatingRect({left:rect.left,top:below+menuHeight>window.innerHeight-8?rect.top-menuHeight-6:below,width:rect.width});
    }
    setOpen(kind);
  };
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{ if(!(event.target as Element).closest("[data-select-root]")) setOpen(null); };
    document.addEventListener("pointerdown",outside); return()=>document.removeEventListener("pointerdown",outside);
  },[]);
  const submit=()=>startTransition(async()=>{
    if(!title.trim()||repeatConflict||repeatNeedsDate)return;
    const form=new FormData();
    if(initial?.taskId)form.set("taskId",initial.taskId);
    if(initial?.id)form.set("itemId",initial.id);
    form.set("title",title.trim()); form.set("location",location);
    form.set(selected?.kind==="project"?"projectId":"areaId",selected?.id??"");
    form.set("estimatedMinutes",estimate?String(Math.max(1,hours*60+minutes)):"");
    form.set("priority",priority); form.set("repeat",repeat);
    form.set("destination",scheduleDates[0]===todayKey?"today":scheduleDates.length?"date":"inbox");
    form.set("date",scheduleDates[0]??selectedKey); form.set("dates",JSON.stringify(scheduleDates));
    await onSubmit(form); onClose();
  });
  const scheduleLabel=scheduleDates.length?scheduleDates.length===1?(scheduleDates[0]===todayKey?(locale==="ko"?"오늘":"Today"):formatDate(scheduleDates[0],locale)):(locale==="ko"?`${formatDate(scheduleDates[0],locale)} 외 ${scheduleDates.length-1}일`:`${formatDate(scheduleDates[0],locale)} +${scheduleDates.length-1} more`):repeat==="none"?(locale==="ko"?"일정 없음":"No date"):(locale==="ko"?"시작일 없음":"No start date");
  return <div className={styles.modalLayer} id="taskModal"><button className={styles.backdrop} aria-label={locale==="ko"?"닫기":"Close"} onClick={onClose}/><section className={`${styles.modal} ${styles.taskModal}`} role="dialog" aria-modal="true" aria-labelledby="taskDialogTitle"><header><div><h2 id="taskDialogTitle">{initial?(locale==="ko"?"작업 수정":"Edit task"):t.newTitle}</h2><p>{t.newHelp}</p></div><button className={styles.iconButton} type="button" onClick={onClose}><Icon name="close"/></button></header><div className={styles.modalBody}>
    <input className={styles.titleInput} value={title} onChange={event=>setTitle(event.target.value)} maxLength={120} autoFocus placeholder={t.taskName}/>
    <div className={styles.field} data-select-root><span>{t.classification}</span><button ref={locationTrigger} className={styles.selectTrigger} type="button" aria-label={t.classification} onClick={()=>openFloating("location",locationTrigger.current)}><span><i className={`${styles.dot} ${styles[selected?.color??"sky"]}`}/><b>{selected?.title??t.inbox}</b></span><Icon name="chevronDown"/></button>{open==="location"&&<div className={`${styles.selectMenu} is-floating`} style={floatingRect??undefined}><label className="menu-search"><Icon name="search"/><input value={locationQuery} onChange={event=>setLocationQuery(event.target.value)} placeholder={locale==="ko"?"영역 또는 프로젝트 검색":"Search areas or projects"}/></label><button type="button" onClick={()=>{setLocation("");setOpen(null);}}><i className={`${styles.dot} ${styles.sky}`}/><span>{t.inbox}</span></button>{visibleOptions.map(option=><button type="button" key={`${option.kind}:${option.id}`} onClick={()=>{setLocation(`${option.kind}:${option.id}`);setOpen(null);}}><i className={`${styles.dot} ${styles[option.color]??styles.gray}`}/><span>{option.title}</span></button>)}</div>}</div>
    <div className={styles.field}><div className={styles.fieldHead}><span>{t.estimate}</span><label className={styles.switch}><input type="checkbox" checked={estimate} onChange={event=>setEstimate(event.target.checked)}/><i/><b>{estimate?t.setTime:t.notSet}</b></label></div>{estimate&&<div className={styles.estimate}><label><input type="number" min={0} value={hours} onChange={event=>setHours(Number(event.target.value))}/><span>{t.hour}</span></label><label><input type="number" min={0} max={59} value={minutes} onChange={event=>setMinutes(Number(event.target.value))}/><span>{t.minute}</span></label><div className="presets">{[15,30,45,60].map(value=><button key={value} type="button" className={hours*60+minutes===value?"is-active":""} onClick={()=>{setHours(Math.floor(value/60));setMinutes(value%60);}}>{formatMinutes(value,locale)}</button>)}</div></div>}</div>
    <fieldset className={styles.field}><legend>{t.priority}</legend><div className={styles.priorityOptions}>{(["low","normal","high"] as Priority[]).map(value=><label key={value} className={`${styles[value]} ${priority===value?styles.prioritySelected:""}`}><input type="radio" name="priority" checked={priority===value} onChange={()=>setPriority(value)}/><span>{t[value]}</span></label>)}</div></fieldset>
    <div className={styles.field} data-select-root><span>{repeat==="none"?t.scheduleField:(locale==="ko"?"반복 시작일":"Repeat starts")}</span><button className={`${styles.selectTrigger} task-schedule-trigger modal-schedule-trigger`} type="button" aria-label={repeat==="none"?t.scheduleField:(locale==="ko"?"반복 시작일":"Repeat starts")} onClick={event=>{setScheduleAnchor(event.currentTarget);setOpen(open==="schedule"?null:"schedule");}}><span><Icon name="calendar"/><b className="schedule-value">{scheduleLabel}</b></span><Icon name="chevronDown"/></button>{open==="schedule"&&<ScheduleDateMenu locale={locale} selected={scheduleDates} singleDate={repeat!=="none"} trigger={scheduleAnchor} onClose={()=>setOpen(null)} onChange={dates=>{setScheduleDates(dates);setOpen(null);}}/>}{repeatNeedsDate&&<small className="field-guidance is-warning">{locale==="ko"?"반복 작업은 시작일 한 개를 선택해야 해요.":"Choose one start date for a repeating task."}</small>}</div>
    <div className={styles.field} data-select-root><span>{t.repeat}</span><button ref={repeatTrigger} className={styles.selectTrigger} type="button" aria-label={t.repeat} onClick={()=>openFloating("repeat",repeatTrigger.current)}><span><b className="repeat-label">{repeat==="none"?t.noRepeat:t[repeat as "daily"|"weekly"|"monthly"]}</b></span><Icon name="chevronDown"/></button>{open==="repeat"&&<div className={`${styles.selectMenu} is-floating repeat-menu`} style={floatingRect??undefined}>{(["none","daily","weekly","monthly"] as const).map(value=><button type="button" key={value} disabled={value!=="none"&&multipleDates} onClick={()=>{setRepeat(value);setOpen(null);}}>{value==="none"?t.noRepeat:t[value]}{value!=="none"&&multipleDates&&<small>{locale==="ko"?"날짜를 하나만 남겨주세요":"Keep only one date"}</small>}</button>)}</div>}{multipleDates&&<small className="field-guidance">{locale==="ko"?"여러 날짜 일정에서는 반복을 설정할 수 없어요.":"Repeat is unavailable while multiple dates are selected."}</small>}{repeatConflict&&<small className="field-guidance is-warning">{locale==="ko"?"반복을 유지하려면 날짜를 하나만 남겨주세요.":"Keep one date to continue using repeat."}</small>}</div>
  </div><footer><button className={`${styles.button} subtle`} type="button" onClick={onClose}>{t.cancel}</button><button className={`${styles.button} ${styles.primary}`} type="button" disabled={pending||!title.trim()||repeatConflict||repeatNeedsDate} onClick={submit}>{initial?(locale==="ko"?"저장":"Save"):t.add}</button></footer></section></div>;
}

function ScheduleDateMenu({locale,selected,singleDate,trigger,onClose,onChange}:{locale:Locale;selected:string[];singleDate:boolean;trigger:HTMLButtonElement|null;onClose:()=>void;onChange:(dates:string[])=>void}) {
  const [draft,setDraft]=useState(selected),[mode,setMode]=useState<"none"|"date">(selected.length?"date":"none"),popover=useRef<HTMLDivElement|null>(null),[position,setPosition]=useState<{left:number;top:number}|null>(null);
  const monthKey=(draft[0]??"2026-07-29").slice(0,7), [year,month]=monthKey.split("-").map(Number);
  const offset=new Date(Date.UTC(year,month-1,1)).getUTCDay(), count=new Date(Date.UTC(year,month,0)).getUTCDate();
  const weekdays=locale==="ko"?["일","월","화","수","목","금","토"]:["S","M","T","W","T","F","S"];
  const label=new Intl.DateTimeFormat(locale==="ko"?"ko-KR":"en-CA",{timeZone:"UTC",year:"numeric",month:"long"}).format(new Date(Date.UTC(year,month-1,1)));
  const toggle=(key:string)=>{setMode("date");setDraft(current=>singleDate?[key]:current.includes(key)?current.filter(date=>date!==key):[...current,key].sort());};
  useLayoutEffect(()=>{
    if(!trigger||!popover.current)return;
    const rect=trigger.getBoundingClientRect(),element=popover.current,height=Math.min(element.scrollHeight,window.innerHeight-16);
    const left=Math.max(8,Math.min(window.innerWidth-element.offsetWidth-8,rect.right-element.offsetWidth));
    const below=rect.bottom+7,top=below+height<=window.innerHeight-8?below:Math.max(8,rect.top-height-7);
    setPosition({left,top});
  },[trigger,mode,draft.length]);
  return <div ref={popover} className="schedule-popover popover" data-schedule-popover onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()} style={position??undefined}>
    <header><div><strong>{locale==="ko"?"일정 설정":"Set date"}</strong><small>{locale==="ko"?"작업을 진행할 날짜를 정해요.":"Choose when to work on this task."}</small></div><button className={styles.iconButton} type="button" onClick={onClose}><Icon name="close"/></button></header>
    <div className="schedule-popover-options"><button className={mode==="none"?"is-active":""} type="button" onClick={()=>{setMode("none");setDraft([]);}}><Icon name="calendar-off"/><span>{locale==="ko"?"일정 없음":"No date"}</span></button><button className={mode==="date"?"is-active":""} type="button" onClick={()=>setMode("date")}><Icon name="calendar-days"/><span>{locale==="ko"?"날짜 선택":"Choose date"}</span></button></div>
    {mode==="date"&&<div className="schedule-popover-calendar"><header><button className={styles.iconButton} type="button"><Icon name="chevronLeft"/></button><strong>{label}</strong><button className={styles.iconButton} type="button"><Icon name="chevronRight"/></button></header><div className={styles.calendarGrid}>{weekdays.map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}{Array.from({length:offset},(_,index)=><span key={`blank-${index}`}/>)}{Array.from({length:count},(_,index)=>{const key=`${monthKey}-${String(index+1).padStart(2,"0")}`;return <button type="button" key={key} className={draft.includes(key)?styles.selected:""} onClick={()=>toggle(key)}>{index+1}</button>;})}</div><div className="schedule-selection-row"><p className="schedule-selection-summary">{singleDate?(locale==="ko"?"반복 시작일은 한 날짜만 선택할 수 있어요.":"A repeating task can have one start date."):(draft.length?(locale==="ko"?`${draft.length}개 날짜 선택`:`${draft.length} ${draft.length===1?"date":"dates"} selected`):(locale==="ko"?"날짜를 여러 개 선택할 수 있어요.":"You can select multiple dates."))}</p>{!singleDate&&draft.length>1&&<button className="schedule-selection-clear" type="button" onClick={()=>setDraft([])}><Icon name="undo" size={10}/><span>{locale==="ko"?"선택 초기화":"Clear selection"}</span></button>}</div></div>}
    <footer><button className={`${styles.button} subtle`} type="button" onClick={onClose}>{locale==="ko"?"취소":"Cancel"}</button><button className={`${styles.button} ${styles.primary}`} type="button" onClick={()=>onChange(mode==="none"?[]:draft)}>{locale==="ko"?"확인":"Confirm"}</button></footer>
  </div>;
}

function SearchModal({locale,items,onClose}:{locale:Locale;items:SearchItem[];onClose:()=>void}) {
  const t=labels[locale],[query,setQuery]=useState(""),router=useRouter(); const filtered=useMemo(()=>items.filter(item=>item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())),[items,query]);
  return <div className={styles.modalLayer} id="searchModal"><button className={styles.backdrop} aria-label={locale==="ko"?"닫기":"Close"} onClick={onClose}/><section className={`${styles.modal} ${styles.searchModal}`} role="dialog" aria-modal="true" aria-labelledby="searchDialogTitle"><header><div><h2 id="searchDialogTitle">{t.search}</h2><p>{t.searchHelp}</p></div><button className={styles.iconButton} type="button" onClick={onClose}><Icon name="close"/></button></header><div className={styles.modalBody}><label className={styles.searchField}><Icon name="search"/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder={t.searchPlaceholder}/><kbd>ESC</kbd></label><div className={styles.results}>{filtered.length?(["task","project","area"] as const).map(kind=>{const group=filtered.filter(item=>item.kind===kind);return group.length?<section key={kind}><h3>{kind==="task"?t.tasks:kind==="project"?t.projects:t.areas}</h3>{group.map(item=><button type="button" data-search-item onClick={()=>router.push(item.href)} key={`${kind}:${item.id}`}><span><i className={`${styles.dot} ${styles[item.color]??styles.gray}`}/><b>{item.title}</b></span><small>{item.meta}</small></button>)}</section>:null;}):<div className={styles.searchEmpty}><span><Icon name="search"/></span><strong>{t.noResults}</strong><small>{locale==="ko"?"다른 단어로 다시 찾아보세요.":"Try another search term."}</small></div>}</div></div></section></div>;
}

function formatMinutes(value:number,locale:Locale){const h=Math.floor(value/60),m=value%60;return locale==="ko"?[h?`${h}시간`:"",m?`${m}분`:""].filter(Boolean).join(" "):[h?`${h}h`:"",m?`${m}m`:""].filter(Boolean).join(" ");}
function formatDate(key:string,locale:Locale){const date=new Date(`${key}T00:00:00Z`);return new Intl.DateTimeFormat(locale==="ko"?"ko-KR":"en-CA",{timeZone:"UTC",month:"short",day:"numeric"}).format(date);}
function focusRecordedMessage(seconds:number,locale:Locale){const minutes=Math.floor(seconds/60),remainder=seconds%60;if(locale==="en")return `Added ${minutes?`${minutes}m`:`${remainder}s`} to today's focus record.`;const value=minutes?`${minutes}분`:`${remainder}초`;return `오늘 집중 기록에 ${value}${minutes?"을":"를"} 추가했어요.`;}
