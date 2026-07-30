"use client";
import { useState } from "react";
import { ApprovedProjectsPresentation, type ProjectPreviewProject, type ProjectPreviewSection } from "@/presentation/projects/projects-view";
import type { ScheduleOption } from "@/presentation/schedule/schedule-view";

const projects:ProjectPreviewProject[]=[
  {id:"workday",title:{ko:"워크데이 개선",en:"Workday improvements"},color:"sky",count:8,area:{id:"growth",title:{ko:"성장",en:"Growth"},color:"lilac"}},
  {id:"portfolio",title:{ko:"포트폴리오",en:"Portfolio"},color:"lilac",count:5},
  {id:"summer",title:{ko:"여름 여행",en:"Summer trip"},color:"butter",count:6},
];
const sections:ProjectPreviewSection[]=[
  {id:"default",title:{ko:"기본 목록",en:"Default list"},tasks:[
    {id:"navigation",title:{ko:"모바일 내비게이션 점검",en:"Review mobile navigation"},goalMinutes:45,priority:"normal",repeat:"none",scheduledDates:["2026-07-31"],schedule:{ko:"7월 31일",en:"Jul 31"}},
  ]},
  {id:"todo",title:{ko:"할 일",en:"To do"},tasks:[
    {id:"copy",title:{ko:"빈 상태 문구 수정",en:"Revise empty-state copy"},goalMinutes:30,priority:"low",repeat:"none",scheduledDates:[],schedule:{ko:"일정 없음",en:"No date"}},
    {id:"icons",title:{ko:"아이콘 크기 점검",en:"Review icon sizing"},goalMinutes:20,priority:"normal",repeat:"none",scheduledDates:["2026-07-31"],schedule:{ko:"7월 31일",en:"Jul 31"}},
  ]},
  {id:"doing",title:{ko:"진행 중",en:"In progress"},tasks:[
    {id:"charts",title:{ko:"리포트 차트 정리",en:"Polish report charts"},goalMinutes:90,focusedSeconds:2520,priority:"high",repeat:"weekly",scheduledDates:["2026-07-30"],schedule:{ko:"7월 30일",en:"Jul 30"}},
  ]},
  {id:"done",title:{ko:"완료",en:"Done"},tasks:[
    {id:"tokens",title:{ko:"색상 토큰 정리",en:"Define color tokens"},goalMinutes:null,focusedSeconds:1500,priority:"normal",repeat:"none",scheduledDates:[],schedule:{ko:"일정 없음",en:"No date"},completed:true},
  ]},
];
const areasKo:ScheduleOption[]=[{id:"growth",title:"성장",color:"lilac",kind:"area"},{id:"health",title:"건강",color:"mint",kind:"area"},{id:"life",title:"생활",color:"peach",kind:"area"}];
const areasEn:ScheduleOption[]=[{id:"growth",title:"Growth",color:"lilac",kind:"area"},{id:"health",title:"Health",color:"mint",kind:"area"},{id:"life",title:"Life",color:"peach",kind:"area"}];
export function ProjectsFixturePreview(){const [locale,setLocale]=useState<"ko"|"en">("ko");return <ApprovedProjectsPresentation locale={locale} onLocaleChange={()=>setLocale(value=>value==="ko"?"en":"ko")} projects={projects} initialSections={sections} areas={locale==="ko"?areasKo:areasEn}/>;}
