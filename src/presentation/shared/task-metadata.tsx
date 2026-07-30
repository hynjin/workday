import { Fragment, type ReactNode } from "react";

type TaskMetadataLocale = "ko" | "en";
type TaskRepeat = "none" | "daily" | "weekly" | "monthly";
type TaskPriority = "low" | "normal" | "high";

function formatMinutes(value:number,locale:TaskMetadataLocale) {
  const hours=Math.floor(value/60),minutes=value%60;
  return locale==="ko"
    ? [hours?`${hours}시간`:"",minutes?`${minutes}분`:""].filter(Boolean).join(" ")
    : [hours?`${hours}h`:"",minutes?`${minutes}m`:""].filter(Boolean).join(" ");
}

function formatFocusedTime(seconds:number,locale:TaskMetadataLocale) {
  return seconds<60
    ? (locale==="ko"?`${seconds}초`:`${seconds}s`)
    : formatMinutes(Math.floor(seconds/60),locale);
}

export function TaskMetadata({
  locale,
  location,
  color="gray",
  goalMinutes,
  focusedSeconds,
  trailing,
}:{
  locale:TaskMetadataLocale;
  location?:string|null;
  color?:string;
  goalMinutes?:number|null;
  focusedSeconds?:number|null;
  trailing?:ReactNode;
}) {
  const values:string[]=[];
  if(goalMinutes)values.push(locale==="ko"?`목표 ${formatMinutes(goalMinutes,locale)}`:`Goal ${formatMinutes(goalMinutes,locale)}`);
  if(focusedSeconds)values.push(locale==="ko"?`집중 ${formatFocusedTime(focusedSeconds,locale)}`:`Focused ${formatFocusedTime(focusedSeconds,locale)}`);

  const items:ReactNode[]=[];
  if(location)items.push(<Fragment key="location"><i className={`dot ${color}`}/><span>{location}</span></Fragment>);
  values.forEach(value=>items.push(<span key={value}>{value}</span>));
  if(!items.length&&!trailing)return null;

  return <small>
    {items.map((item,index)=><Fragment key={index}>{index>0&&<span aria-hidden="true">·</span>}{item}</Fragment>)}
    {trailing}
  </small>;
}

export function TaskRepeatMetadata({locale,repeat}:{locale:TaskMetadataLocale;repeat:TaskRepeat}) {
  if(repeat==="none")return null;
  const label=locale==="ko"
    ? {daily:"매일 반복",weekly:"매주 반복",monthly:"매월 반복"}[repeat]
    : {daily:"Daily",weekly:"Weekly",monthly:"Monthly"}[repeat];
  return <span className="repeat-meta"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-repeat"/></svg><span>{label}</span></span>;
}

export function TaskPriorityBadge({locale,priority}:{locale:TaskMetadataLocale;priority:TaskPriority}) {
  const label=locale==="ko"
    ? {low:"낮음",normal:"보통",high:"높음"}[priority]
    : {low:"Low",normal:"Normal",high:"High"}[priority];
  return <span className={`priority ${priority}`}>{label}</span>;
}
