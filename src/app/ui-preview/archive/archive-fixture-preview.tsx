"use client";
import { useState } from "react";
import { ApprovedArchivePresentation, type ArchivePreviewItem } from "@/presentation/archive/archive-view";
const items:ArchivePreviewItem[]=[
  {id:"portfolio",kind:"project",title:{ko:"지난 포트폴리오 개편",en:"Previous portfolio refresh"},color:"lilac"},
  {id:"reading",kind:"area",title:{ko:"예전 독서 목록",en:"Old reading list"},color:"butter"},
  {id:"insurance",kind:"task",title:{ko:"보험 서류 정리",en:"Organize insurance documents"},color:"peach"},
];
export function ArchiveFixturePreview(){const [locale,setLocale]=useState<"ko"|"en">("ko");return <ApprovedArchivePresentation locale={locale} onLocaleChange={()=>setLocale(value=>value==="ko"?"en":"ko")} initialItems={items}/>;}
