"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApprovedSchedulePresentation,
  type ScheduleDay,
  type ScheduleItem,
  type ScheduleLocale,
  type ScheduleOption,
  type ScheduleSearchItem,
} from "@/presentation/schedule/schedule-view";
import { formatScheduleEyebrow } from "@/presentation/schedule/format-schedule-date";
import { ApprovedFocusPresentation } from "@/presentation/focus/focus-view";

type FixtureState = {
  version:1;
  locale:ScheduleLocale;
  selectedDate:string;
  monthKey:string;
  items:ScheduleItem[];
  totalFocusedSeconds?:number;
};

const STORAGE_KEY = "workday-ui-preview-schedule-v3";
const TODAY = "2026-07-29";
const options:ScheduleOption[] = [
  {id:"area-health",title:"건강",color:"mint",kind:"area"},
  {id:"project-portfolio",title:"포트폴리오",color:"lilac",kind:"project"},
  {id:"area-life",title:"생활",color:"peach",kind:"area"},
];
const initialItems:ScheduleItem[] = [
  {id:"fixture-1",taskId:"task-1",title:"주간 리뷰 정리",status:"planned",projectTitle:"워크데이 개선",locationColor:"sky",priority:"high",estimatedMinutes:45,dailyGoalMinutes:45,focusedSeconds:2520,projectId:"project-workday",areaId:null,repeat:"weekly",scheduledDates:["2026-07-24",TODAY]},
  {id:"fixture-2",taskId:"task-2",title:"아침 스트레칭",status:"completed",projectTitle:"건강",locationColor:"mint",priority:"low",estimatedMinutes:15,dailyGoalMinutes:15,focusedSeconds:900,projectId:null,areaId:"area-health",repeat:"daily",scheduledDates:[TODAY]},
  {id:"fixture-3",taskId:"task-3",title:"포트폴리오 문구 다듬기",status:"planned",projectTitle:"포트폴리오",locationColor:"lilac",priority:"normal",estimatedMinutes:80,dailyGoalMinutes:80,projectId:"project-portfolio",areaId:null,repeat:"none",scheduledDates:[TODAY,"2026-07-30"]},
  {id:"fixture-4",taskId:"task-4",title:"병원 예약 확인",status:"planned",projectTitle:"생활",locationColor:"peach",priority:"normal",estimatedMinutes:null,dailyGoalMinutes:null,projectId:null,areaId:"area-life",repeat:"none",scheduledDates:["2026-07-24",TODAY]},
];
const initialState:FixtureState = {version:1,locale:"ko",selectedDate:TODAY,monthKey:"2026-07",items:initialItems,totalFocusedSeconds:8100};

function parsedDates(form:FormData, fallback:string[]) {
  try {
    const value=JSON.parse(String(form.get("dates")??"[]"));
    return Array.isArray(value)&&value.every(item=>typeof item==="string")?value:fallback;
  } catch {
    return fallback;
  }
}
function nextId() {
  return typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():`fixture-${Date.now()}`;
}

export function ScheduleFixturePreview() {
  const [state,setState]=useState<FixtureState>(initialState);
  const [hydrated,setHydrated]=useState(false);
  const [activeFocus,setActiveFocus]=useState<{itemId:string;startedAt:number}|null>(null);
  const [focusSeconds,setFocusSeconds]=useState(0);
  const [toasts,setToasts]=useState<{id:string;seconds:number}[]>([]);
  useEffect(()=>{
    const stored=window.localStorage.getItem(STORAGE_KEY);
    let restored:FixtureState|undefined;
    if(stored) {
      try {
        const parsed=JSON.parse(stored) as FixtureState;
        if(parsed.version===1&&Array.isArray(parsed.items)) restored=parsed;
      } catch {}
    }
    queueMicrotask(()=>{
      if(restored)setState(restored);
      setHydrated(true);
    });
  },[]);
  useEffect(()=>{if(hydrated)window.localStorage.setItem(STORAGE_KEY,JSON.stringify(state));},[hydrated,state]);
  useEffect(()=>{
    if(!activeFocus)return;
    const tick=()=>setFocusSeconds(Math.max(0,Math.floor((Date.now()-activeFocus.startedAt)/1000)));
    const timer=window.setInterval(tick,1000);
    return()=>window.clearInterval(timer);
  },[activeFocus]);

  const selectedItems=useMemo(()=>state.items.filter(item=>item.scheduledDates?.includes(state.selectedDate)),[state.items,state.selectedDate]);
  const monthDate=new Date(`${state.monthKey}-01T00:00:00Z`);
  const monthOffset=monthDate.getUTCDay();
  const dayCount=new Date(Date.UTC(monthDate.getUTCFullYear(),monthDate.getUTCMonth()+1,0)).getUTCDate();
  const recorded=new Set(["2026-07-03","2026-07-08","2026-07-12","2026-07-18","2026-07-24",TODAY]);
  state.items.forEach(item=>(item.scheduledDates??[]).forEach(date=>recorded.add(date)));
  const days:ScheduleDay[]=Array.from({length:dayCount},(_,index)=>{
    const key=`${state.monthKey}-${String(index+1).padStart(2,"0")}`;
    return {key,hasWorkday:recorded.has(key),selected:key===state.selectedDate,today:key===TODAY};
  });
  const previous=new Date(monthDate); previous.setUTCMonth(previous.getUTCMonth()-1);
  const next=new Date(monthDate); next.setUTCMonth(next.getUTCMonth()+1);
  const localizedOptions=options.map(option=>({
    ...option,
    title:state.locale==="en"
      ? ({건강:"Health",생활:"Life","워크데이 개선":"Workday improvements",포트폴리오:"Portfolio"}[option.title]??option.title)
      : option.title,
  }));
  const taskTranslations:Record<string,string> = {"주간 리뷰 정리":"Organize weekly review","아침 스트레칭":"Morning stretch","포트폴리오 문구 다듬기":"Refine portfolio copy","병원 예약 확인":"Confirm appointment"};
  const locationTranslations:Record<string,string> = {"워크데이 개선":"Workday improvements","건강":"Health","포트폴리오":"Portfolio","생활":"Life"};
  const displayItems=selectedItems.map(item=>state.locale==="en"?{...item,title:taskTranslations[item.title]??item.title,projectTitle:item.projectTitle?locationTranslations[item.projectTitle]??item.projectTitle:null}:item);
  const approvedSearchItems:ScheduleSearchItem[]=state.locale==="ko"
    ? [
        {id:"search-task-review",title:"주간 리뷰 정리",color:"sky",kind:"task",meta:"오늘 · 워크데이 개선",href:"#"},
        {id:"search-task-portfolio",title:"포트폴리오 문구 다듬기",color:"lilac",kind:"task",meta:"작업 · 포트폴리오",href:"#"},
        {id:"search-project-workday",title:"워크데이 개선",color:"sky",kind:"project",meta:"프로젝트 · 진행 중",href:"#"},
        {id:"search-project-run",title:"10km 달리기",color:"mint",kind:"project",meta:"프로젝트 · 건강",href:"#"},
        {id:"search-area-health",title:"건강",color:"mint",kind:"area",meta:"영역 · 직접 작업 4개",href:"#"},
      ]
    : [
        {id:"search-task-review",title:"Organize weekly review",color:"sky",kind:"task",meta:"Today · Workday improvements",href:"#"},
        {id:"search-task-portfolio",title:"Refine portfolio copy",color:"lilac",kind:"task",meta:"Task · Portfolio",href:"#"},
        {id:"search-project-workday",title:"Workday improvements",color:"sky",kind:"project",meta:"Project · Active",href:"#"},
        {id:"search-project-run",title:"Run 10km",color:"mint",kind:"project",meta:"Project · Health",href:"#"},
        {id:"search-area-health",title:"Health",color:"mint",kind:"area",meta:"Area · 4 direct tasks",href:"#"},
      ];
  const approvedTaskIds=new Set(["task-1","task-2","task-3","task-4"]);
  const searchItems:ScheduleSearchItem[]=[
    ...approvedSearchItems,
    ...state.items.filter(item=>!approvedTaskIds.has(item.taskId??"")).map(item=>({
      id:item.taskId??item.id,title:state.locale==="en"?(taskTranslations[item.title]??item.title):item.title,color:item.locationColor,kind:"task" as const,
      meta:item.projectTitle?(state.locale==="en"?(locationTranslations[item.projectTitle]??item.projectTitle):item.projectTitle):(state.locale==="ko"?"수집함":"Inbox"),href:"#",
    })),
  ];
  const update=(recipe:(items:ScheduleItem[])=>ScheduleItem[])=>setState(current=>({...current,items:recipe(current.items)}));
  const complete=async(form:FormData)=>{const id=String(form.get("itemId"));update(items=>items.map(item=>item.id===id?{...item,status:item.status==="completed"?"planned":"completed"}:item));};
  const remove=async(form:FormData)=>{const id=String(form.get("itemId"));update(items=>items.map(item=>item.id===id?{...item,scheduledDates:(item.scheduledDates??[]).filter(date=>date!==state.selectedDate)}:item));};
  const deleteTask=async(form:FormData)=>{const id=String(form.get("itemId"));update(items=>items.filter(item=>item.id!==id));};
  const archiveTask=async(form:FormData)=>{const taskId=String(form.get("itemId"));update(items=>items.filter(item=>item.taskId!==taskId));};
  const createTask=async(form:FormData)=>{
    const location=String(form.get("location")??"");
    const option=localizedOptions.find(item=>`${item.kind}:${item.id}`===location);
    const dates=parsedDates(form,[state.selectedDate]);
    const goalMinutes=form.get("estimatedMinutes")?Number(form.get("estimatedMinutes")):null;
    const item:ScheduleItem={id:nextId(),taskId:nextId(),title:String(form.get("title")??"").trim(),status:"planned",projectTitle:option?.title??null,locationColor:option?.color??"sky",priority:String(form.get("priority")??"normal") as ScheduleItem["priority"],estimatedMinutes:goalMinutes,dailyGoalMinutes:goalMinutes,focusedSeconds:0,projectId:option?.kind==="project"?option.id:null,areaId:option?.kind==="area"?option.id:null,repeat:String(form.get("repeat")??"none") as ScheduleItem["repeat"],scheduledDates:dates};
    if(item.title)update(items=>[...items,item]);
  };
  const editTask=async(form:FormData)=>{
    const taskId=String(form.get("taskId")),location=String(form.get("location")??"");
    const option=localizedOptions.find(item=>`${item.kind}:${item.id}`===location);
    const goalMinutes=form.get("estimatedMinutes")?Number(form.get("estimatedMinutes")):null;
    update(items=>items.map(item=>item.taskId===taskId?{...item,title:String(form.get("title")??item.title).trim(),projectTitle:option?.title??null,locationColor:option?.color??"sky",projectId:option?.kind==="project"?option.id:null,areaId:option?.kind==="area"?option.id:null,priority:String(form.get("priority")??item.priority) as ScheduleItem["priority"],estimatedMinutes:goalMinutes,dailyGoalMinutes:goalMinutes,repeat:String(form.get("repeat")??item.repeat) as ScheduleItem["repeat"],scheduledDates:parsedDates(form,item.scheduledDates??[])}:item));
  };
  const reorder=async(itemId:string,targetIndex:number)=>{
    setState(current=>{
      const visible=current.items.filter(item=>item.scheduledDates?.includes(current.selectedDate));
      const target=visible[targetIndex];
      const moving=current.items.find(item=>item.id===itemId);
      if(!moving||!target||moving.id===target.id)return current;
      const items=current.items.filter(item=>item.id!==itemId);
      const insertAt=items.findIndex(item=>item.id===target.id);
      items.splice(insertAt<0?items.length:insertAt,0,moving);
      return {...current,items};
    });
  };
  const selectMonth=(month:string)=>setState(current=>({...current,monthKey:month}));
  const selectDate=(date:string)=>setState(current=>({...current,selectedDate:date,monthKey:date.slice(0,7)}));
  const title=state.selectedDate===TODAY
    ? (state.locale==="ko"?"오늘의 일정":"Today's schedule")
    : state.locale==="ko"
      ? `${Number(state.selectedDate.slice(5,7))}월 ${Number(state.selectedDate.slice(8))}일 일정`
      : `Schedule for ${new Intl.DateTimeFormat("en-CA",{timeZone:"UTC",month:"long",day:"numeric"}).format(new Date(`${state.selectedDate}T00:00:00Z`))}`;

  const focusedItem=activeFocus?state.items.find(item=>item.id===activeFocus.itemId):undefined;
  const endFixtureFocus=()=>{
    if(!activeFocus)return;
    const seconds=Math.max(0,Math.floor((Date.now()-activeFocus.startedAt)/1000));
    const id=nextId();
    setActiveFocus(null);
    setState(current=>({...current,totalFocusedSeconds:(current.totalFocusedSeconds??8100)+seconds}));
    setToasts(current=>[...current,{id,seconds}]);
    window.setTimeout(()=>setToasts(current=>current.filter(toast=>toast.id!==id)),3500);
  };
  if(focusedItem) return <ApprovedFocusPresentation
    locale={state.locale}
    title={state.locale==="en"?(taskTranslations[focusedItem.title]??focusedItem.title):focusedItem.title}
    location={state.locale==="en"?(locationTranslations[focusedItem.projectTitle??""]??focusedItem.projectTitle??"Inbox"):(focusedItem.projectTitle??"수집함")}
    color={focusedItem.locationColor}
    goalMinutes={focusedItem.dailyGoalMinutes}
    elapsedSeconds={focusSeconds}
    previousSeconds={state.totalFocusedSeconds??8100}
    onEnd={endFixtureFocus}
  />;
  return <div data-ui-preview>
    <ApprovedSchedulePresentation
      locale={state.locale} selectedKey={state.selectedDate} todayKey={TODAY} monthKey={state.monthKey}
      monthLabel={`${monthDate.getUTCFullYear()}년 ${monthDate.getUTCMonth()+1}월`}
      monthOffset={monthOffset} previousMonth={previous.toISOString().slice(0,7)} nextMonth={next.toISOString().slice(0,7)}
      title={title} eyebrow={formatScheduleEyebrow(state.selectedDate)}
      items={displayItems} days={days} totalSeconds={state.totalFocusedSeconds??8100} actionable={state.selectedDate===TODAY}
      options={localizedOptions} searchItems={searchItems}
      onComplete={complete} onStartFocus={async form=>{setFocusSeconds(0);setActiveFocus({itemId:String(form.get("itemId")),startedAt:Date.now()});}} onRemove={remove} onUndoRemove={async()=>{}}
      onCreateTask={createTask} onUpdateTask={editTask} onDeleteTask={deleteTask} onArchiveTask={archiveTask} onReorder={reorder}
      onLocaleChange={async locale=>setState(current=>({...current,locale}))} onSignOut={async()=>{}}
      onSelectDate={selectDate} onSelectMonth={selectMonth}
      refreshAfterLocaleChange={false}
      refreshAfterMutation={false}
      navigationBasePath="/ui-preview"
    />
    <div className="focus-toast-stack" aria-live="polite" aria-atomic="false">{toasts.map(toast=><div className="focus-toast is-visible" role="status" key={toast.id}><span><svg><use href="#i-check"/></svg></span><div><strong>{state.locale==="ko"?"집중 시간이 기록됐어요":"Focus time recorded"}</strong><small>{state.locale==="ko"?`오늘 집중 기록에 ${toast.seconds<60?`${toast.seconds}초를`:`${Math.floor(toast.seconds/60)}분을`} 추가했어요.`:`Added ${toast.seconds<60?`${toast.seconds}s`:`${Math.floor(toast.seconds/60)}m`} to today's focus record.`}</small></div></div>)}</div>
  </div>;
}
