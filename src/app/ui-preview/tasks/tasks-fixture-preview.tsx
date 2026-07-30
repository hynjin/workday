"use client";

import { useState } from "react";
import { ApprovedTasksPresentation, type TaskPreviewItem } from "@/presentation/tasks/tasks-view";

const items:TaskPreviewItem[]=[
  {id:"task-1",title:{ko:"여행 체크리스트 만들기",en:"Create travel checklist"},category:{ko:"분류 없음",en:"No category"},color:"gray",goal:{ko:"목표 30분",en:"Goal 30m"},goalMinutes:30,priority:"normal",repeat:{ko:"매주 반복",en:"Weekly"},repeatValue:"weekly",schedule:{ko:"일정 없음",en:"No date"}},
  {id:"task-2",title:{ko:"책상 조명 비교하기",en:"Compare desk lights"},category:{ko:"생활",en:"Life"},color:"peach",goal:{ko:"",en:""},goalMinutes:null,focusedSeconds:1500,priority:"high",scheduledDates:["2026-07-30"],schedule:{ko:"7월 30일",en:"Jul 30"}},
  {id:"task-3",title:{ko:"새 프로젝트 아이디어 정리",en:"Outline new project ideas"},category:{ko:"개인 프로젝트",en:"Personal project"},color:"lilac",goal:{ko:"목표 1시간",en:"Goal 1h"},goalMinutes:60,priority:"low",repeat:{ko:"매월 반복",en:"Monthly"},repeatValue:"monthly",schedule:{ko:"일정 없음",en:"No date"}},
];

export function TasksFixturePreview(){
  const [locale,setLocale]=useState<"ko"|"en">("ko");
  return <ApprovedTasksPresentation locale={locale} onLocaleChange={()=>setLocale(value=>value==="ko"?"en":"ko")} items={items}/>;
}
