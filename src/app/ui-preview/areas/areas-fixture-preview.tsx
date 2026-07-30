"use client";

import { useState } from "react";
import {
  ApprovedAreasPresentation,
  type AreaPreviewArea,
  type AreaPreviewProject,
  type AreaPreviewTask,
} from "@/presentation/areas/areas-view";

const areas:AreaPreviewArea[]=[
  {id:"health",title:{ko:"건강",en:"Health"},color:"mint",count:4},
  {id:"growth",title:{ko:"성장",en:"Growth"},color:"lilac",count:6},
  {id:"life",title:{ko:"생활",en:"Life"},color:"peach",count:3},
  {id:"relationships",title:{ko:"관계",en:"Relationships"},color:"butter",count:2},
];
const projects:AreaPreviewProject[]=[
  {id:"morning",title:{ko:"아침 루틴 만들기",en:"Build morning routine"},color:"mint",completed:7,total:10},
  {id:"running",title:{ko:"10km 달리기",en:"Run 10km"},color:"sky",completed:4,total:8},
];
const tasks:AreaPreviewTask[]=[
  {id:"vitamins",title:{ko:"비타민 챙기기",en:"Take vitamins"},goalMinutes:10,focusedSeconds:480,priority:"normal",repeat:"daily",scheduledDates:["2026-07-30"],schedule:{ko:"7월 30일",en:"Jul 30"}},
  {id:"sleep",title:{ko:"수면 기록 확인",en:"Review sleep log"},goalMinutes:null,priority:"low",repeat:"weekly",scheduledDates:[],schedule:{ko:"일정 없음",en:"No date"}},
];

export function AreasFixturePreview() {
  const [locale,setLocale]=useState<"ko"|"en">("ko");
  return <ApprovedAreasPresentation locale={locale} onLocaleChange={()=>setLocale(value=>value==="ko"?"en":"ko")} areas={areas} projects={projects} tasks={tasks}/>;
}
