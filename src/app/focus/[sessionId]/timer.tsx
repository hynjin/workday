"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { endFocus } from "@/lib/actions";
import { formatDuration } from "@/lib/workday-date";

export default function FocusTimer({ sessionId, title, startedAt, previousSeconds, goalMinutes, location, color, locale }: {
  sessionId: string;
  title: string;
  startedAt: string;
  previousSeconds: number;
  goalMinutes: number | null;
  location: string;
  color: string;
  locale: "ko" | "en";
}) {
  const getElapsed = () => Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const [elapsed, setElapsed] = useState(getElapsed);
  const [recorded, setRecorded] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (recorded !== null) return;
    const id = window.setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, recorded]);
  const end = () => startTransition(async () => {
    const form = new FormData();
    form.set("sessionId", sessionId);
    const duration = await endFocus(form);
    setRecorded(duration);
  });
  const progress = goalMinutes ? Math.min(100, Math.round(elapsed / (goalMinutes * 60) * 100)) : 0;
  return <section className="focusShell">
    <header className="focusTopbar"><div className="appBrand"><span className="appMark">☁</span><strong>Workday</strong></div><span className="focusStatus">{locale === "ko" ? "집중 중" : "Focusing"}</span></header>
    {recorded === null ? <main className="focusContent">
      <span className="focusLocation"><i className={`colorDot ${color}`}/>{location}</span>
      <h1>{title}</h1>
      <span className="focusGoal">{goalMinutes ? (locale === "ko" ? `목표 ${goalMinutes}분` : `Goal ${goalMinutes} min`) : (locale === "ko" ? "목표 시간 없음" : "No goal time")}</span>
      <div className={`focusRing ${goalMinutes ? "withGoal" : "noGoal"}`} style={{ "--focus-progress": `${progress * 3.6}deg` } as React.CSSProperties}><div><span>{locale === "ko" ? "현재 세션" : "Current session"}</span><strong>{formatDuration(elapsed, true)}</strong></div></div>
      <div className="focusTotal">{locale === "ko" ? "오늘 누적" : "Today total"} <strong>{formatDuration(previousSeconds + elapsed, true)}</strong></div>
      <button className="focusEnd" type="button" onClick={end} disabled={pending}>{pending ? (locale === "ko" ? "기록 중…" : "Saving…") : (locale === "ko" ? "세션 종료" : "End session")}</button>
      <small>{locale === "ko" ? "종료하면 지금까지의 시간이 자동으로 기록돼요." : "Your focused time is saved when the session ends."}</small>
    </main> : <main className="focusSummary"><div className="focusDone">✓</div><h1>{locale === "ko" ? "집중 세션을 기록했어요" : "Focus session recorded"}</h1><p>{title} · {formatDuration(recorded, true)}</p><Link className="button" href="/">{locale === "ko" ? "오늘의 일정으로" : "Back to today"}</Link></main>}
  </section>;
}
