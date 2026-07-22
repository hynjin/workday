"use client";
import { useEffect, useState } from "react";
import { endFocus } from "@/lib/actions";
import { formatDuration } from "@/lib/workday-date";

export default function FocusTimer({ sessionId, title, startedAt, previousSeconds }: { sessionId: string; title: string; startedAt: string; previousSeconds: number }) {
  const getElapsed = () => Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const [elapsed, setElapsed] = useState(getElapsed);
  useEffect(() => { const id = window.setInterval(() => setElapsed(getElapsed()), 1000); return () => window.clearInterval(id); });
  return <main className="focusScreen"><p className="eyebrow">집중 중</p><h1>{title}</h1><div className="timerBlock"><span>현재 세션</span><strong>{formatDuration(elapsed, true)}</strong></div><div className="cumulative"><span>이번 작업일 누적</span><strong>{formatDuration(previousSeconds + elapsed, true)}</strong></div><form action={endFocus}><input type="hidden" name="sessionId" value={sessionId}/><button className="button danger large">세션 종료</button></form></main>;
}
