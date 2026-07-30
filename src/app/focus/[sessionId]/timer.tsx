"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { endProductFocus } from "@/adapters/focus-actions";
import { ApprovedFocusPresentation } from "@/presentation/focus/focus-view";

export default function FocusTimer({ sessionId, title, startedAt, previousSeconds, goalMinutes, location, color, locale }: {
  sessionId:string;
  title:string;
  startedAt:string;
  previousSeconds:number;
  goalMinutes:number|null;
  location:string;
  color:string;
  locale:"ko"|"en";
}) {
  const router=useRouter();
  const startedAtMs=new Date(startedAt).getTime();
  const [elapsed,setElapsed]=useState(()=>Math.max(0,Math.floor((Date.now()-startedAtMs)/1000)));
  const [pending,startTransition]=useTransition();
  useEffect(()=>{
    const id=window.setInterval(()=>setElapsed(Math.max(0,Math.floor((Date.now()-startedAtMs)/1000))),1000);
    return()=>window.clearInterval(id);
  },[startedAtMs]);
  const end=()=>startTransition(async()=>{
    const form=new FormData();
    form.set("sessionId",sessionId);
    const recorded=await endProductFocus(form);
    router.replace(`/?focused=${recorded}`);
  });
  return <ApprovedFocusPresentation locale={locale} title={title} location={location} color={color} goalMinutes={goalMinutes} elapsedSeconds={elapsed} previousSeconds={previousSeconds} pending={pending} onEnd={end}/>;
}
