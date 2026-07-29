"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { deleteGuest, getAll, getDeviceId, putGuest, type GuestItem, type GuestSession, type GuestTask } from "@/lib/guest-db";
import type { Locale } from "@/lib/i18n";

const today = () => new Date().toLocaleDateString("en-CA");
const now = () => new Date().toISOString();
const duration = (seconds: number, locale: Locale) => locale === "ko" ? `${Math.floor(seconds / 60)}분 ${seconds % 60}초` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

export function GuestWorkspace({ locale }: { locale: Locale }) {
  const [tasks, setTasks] = useState<GuestTask[]>([]);
  const [items, setItems] = useState<GuestItem[]>([]);
  const [sessions, setSessions] = useState<GuestSession[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [title, setTitle] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [clock, setClock] = useState(() => 0);

  const reload = useCallback(async () => {
    const [nextDevice, nextTasks, nextItems, nextSessions] = await Promise.all([
      getDeviceId(), getAll<GuestTask>("tasks"), getAll<GuestItem>("items"), getAll<GuestSession>("sessions"),
    ]);
    setDeviceId(nextDevice); setTasks(nextTasks); setItems(nextItems); setSessions(nextSessions);
    setActiveId(nextSessions.find(session => !session.endedAt)?.localId ?? null);
  }, []);
  useEffect(() => { queueMicrotask(() => void reload()); }, [reload]);
  useEffect(() => {
    if (!activeId) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeId]);

  const todayItems = useMemo(() => items.filter(item => item.date === today() && !item.dismissedAt), [items]);
  const upcomingItems = useMemo(() => items.filter(item => item.date > today() && !item.dismissedAt).sort((a, b) => a.date.localeCompare(b.date)), [items]);
  const active = sessions.find(session => session.localId === activeId);
  const activeSeconds = active ? Math.max(0, Math.floor((clock - new Date(active.startedAt).getTime()) / 1000)) : 0;

  const createTask = async () => {
    const clean = title.trim(); if (!clean || !deviceId) return;
    const timestamp = now();
    const task: GuestTask = { localId: crypto.randomUUID(), deviceId, title: clean, createdAt: timestamp, updatedAt: timestamp };
    await putGuest("tasks", task); setTitle(""); await reload();
  };
  const schedule = async (task: GuestTask, date = today()) => {
    const existing = items.find(item => item.taskLocalId === task.localId && item.date === date);
    if (existing) {
      if (existing.dismissedAt) await updateItem(existing, { dismissedAt: null });
      return;
    }
    const timestamp = now();
    await putGuest("items", {
      localId: crypto.randomUUID(), deviceId, taskLocalId: task.localId, date, title: task.title,
      status: "planned", dailyGoalMinutes: null, completedAt: null, dismissedAt: null, createdAt: timestamp, updatedAt: timestamp,
    } satisfies GuestItem);
    await reload();
  };
  const updateItem = async (item: GuestItem, patch: Partial<GuestItem>) => {
    await putGuest("items", { ...item, ...patch, updatedAt: now() }); await reload();
  };
  const start = async (item: GuestItem) => {
    if (activeId) return;
    const timestamp = now();
    const session: GuestSession = {
      localId: crypto.randomUUID(), deviceId, itemLocalId: item.localId, startedAt: timestamp,
      endedAt: null, durationSeconds: null, createdAt: timestamp, updatedAt: timestamp,
    };
    await putGuest("sessions", session); setClock(Date.now()); await reload();
  };
  const stop = async () => {
    if (!active) return;
    await putGuest("sessions", { ...active, endedAt: now(), durationSeconds: activeSeconds, updatedAt: now() });
    await reload();
  };
  const removeItem = async (item: GuestItem) => { await updateItem(item, { dismissedAt: now() }); };

  return <main className="wd-guest">
    <header className="wd-page-head"><div><span className="wd-eyebrow">{locale === "ko" ? "이 기기에 저장 중" : "SAVED ON THIS DEVICE"}</span><h1>{locale === "ko" ? "오늘의 작업" : "Today’s tasks"}</h1><span className="wd-muted">{locale === "ko" ? "로그인 없이 바로 사용하고, 나중에 기록을 계정에 백업할 수 있어요." : "Use the app now, then back up this device later."}</span></div><Link className="wd-button is-primary" href="/login">{locale === "ko" ? "로그인·백업" : "Sign in & back up"}</Link></header>
    <aside className="wd-guest-notice">{locale === "ko" ? "이 기록은 현재 브라우저에만 저장됩니다." : "This data is saved only in this browser."}</aside>
    {active && <section className="wd-guest-timer"><span>{locale === "ko" ? "집중 중" : "Focusing"}</span><strong>{duration(activeSeconds, locale)}</strong><button className="wd-button is-primary" onClick={stop}>{locale === "ko" ? "집중 종료" : "Stop focus"}</button></section>}
    <div className="wd-guest-grid">
      <section><div className="wd-content-head"><h3>{locale === "ko" ? "수집함" : "Inbox"}</h3><span className="wd-muted">{tasks.length}</span></div>
        <form className="wd-guest-create" onSubmit={event => { event.preventDefault(); void createTask(); }}><input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required placeholder={locale === "ko" ? "새 작업" : "New task"}/><button className="wd-button">{locale === "ko" ? "만들기" : "Create"}</button></form>
        <div className="wd-guest-list">{tasks.map(task => <article key={task.localId}><strong>{task.title}</strong><div><button onClick={() => schedule(task)}>{locale === "ko" ? "오늘" : "Today"}</button><label><span>{locale === "ko" ? "날짜" : "Date"}</span><input type="date" min={today()} defaultValue={today()} aria-label={`${task.title} ${locale === "ko" ? "날짜 지정" : "schedule date"}`} onChange={event => void schedule(task, event.target.value)}/></label><button className="is-danger" onClick={async () => { if (items.some(item => item.taskLocalId === task.localId)) return; await deleteGuest("tasks", task.localId); await reload(); }}>{locale === "ko" ? "삭제" : "Delete"}</button></div></article>)}</div>
      </section>
      <section><div className="wd-content-head"><h3>{locale === "ko" ? "오늘" : "Today"}</h3><span className="wd-muted">{todayItems.length}</span></div>
        <div className="wd-guest-list">{todayItems.map(item => {
          const focused = sessions.filter(session => session.itemLocalId === item.localId).reduce((sum, session) => sum + (session.durationSeconds ?? (session.localId === activeId ? activeSeconds : 0)), 0);
          return <article key={item.localId} className={item.status === "completed" ? "is-done" : ""}><div><strong>{item.title}</strong><small>{locale === "ko" ? "목표" : "Goal"} {item.dailyGoalMinutes ?? "—"}m · {locale === "ko" ? "집중" : "Focused"} {duration(focused, locale)}</small></div><div>
            <input type="number" min="1" max="1440" value={item.dailyGoalMinutes ?? ""} aria-label={locale === "ko" ? "목표 시간" : "Goal time"} onChange={event => void updateItem(item, { dailyGoalMinutes: event.target.value ? Number(event.target.value) : null })}/>
            {item.status === "planned" && <button disabled={Boolean(activeId)} onClick={() => start(item)}>{locale === "ko" ? "집중" : "Focus"}</button>}
            <button onClick={() => updateItem(item, { status: item.status === "completed" ? "planned" : "completed", completedAt: item.status === "completed" ? null : now() })}>{item.status === "completed" ? (locale === "ko" ? "완료 취소" : "Undo") : (locale === "ko" ? "완료" : "Complete")}</button>
            <button disabled={active?.itemLocalId === item.localId} onClick={() => removeItem(item)}>{locale === "ko" ? "빼기" : "Remove"}</button>
          </div></article>;
        })}</div>
      </section>
    </div>
    <section className="wd-guest-upcoming"><div className="wd-content-head"><h3>{locale === "ko" ? "예정" : "Upcoming"}</h3><span className="wd-muted">{upcomingItems.length}</span></div><div className="wd-guest-list">{upcomingItems.map(item => <article key={item.localId}><div><strong>{item.title}</strong><small>{item.date}</small></div><button onClick={() => removeItem(item)}>{locale === "ko" ? "일정 해제" : "Clear date"}</button></article>)}</div>{!upcomingItems.length && <p className="wd-empty-inline">{locale === "ko" ? "예정된 작업이 없습니다." : "No upcoming tasks."}</p>}</section>
  </main>;
}
