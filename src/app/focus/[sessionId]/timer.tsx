"use client";
import { useEffect, useState } from "react";
import { endFocus } from "@/lib/actions";
import { formatDuration } from "@/lib/workday-date";

export default function FocusTimer({ sessionId, title, startedAt, previousSeconds, locale }: { sessionId: string; title: string; startedAt: string; previousSeconds: number; locale: "ko" | "en" }) {
  const getElapsed = () => Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const [elapsed, setElapsed] = useState(getElapsed);
  useEffect(() => {
    const id = window.setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return <main className="focusScreen"><p className="eyebrow">{locale === "ko" ? "집중 중" : "FOCUSING"}</p><h1>{title}</h1><div className="timerBlock"><span>{locale === "ko" ? "현재 세션" : "Current session"}</span><strong>{formatDuration(elapsed, true)}</strong></div><div className="cumulative"><span>{locale === "ko" ? "이번 작업일 누적" : "Workday total"}</span><strong>{formatDuration(previousSeconds + elapsed, true)}</strong></div><form action={endFocus}><input type="hidden" name="sessionId" value={sessionId}/><button className="button danger large">{locale === "ko" ? "세션 종료" : "End session"}</button></form></main>;
}
