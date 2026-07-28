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

  return <main className="shell guestShell">
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "이 기기에 저장 중" : "SAVED ON THIS DEVICE"}</p><h1>{locale === "ko" ? "오늘의 작업" : "Today’s tasks"}</h1><p className="lede">{locale === "ko" ? "로그인 없이 바로 사용하고, 나중에 이 기기의 기록을 계정에 백업할 수 있습니다." : "Use the app now without signing in, then back up this device to your account later."}</p></div><Link className="button" href="/login">{locale === "ko" ? "로그인·백업" : "Sign in & back up"}</Link></header>
    <aside className="localOnlyNotice">{locale === "ko" ? "브라우저 데이터 삭제, 시크릿 모드 종료, 기기 초기화 시 이 기록이 사라질 수 있습니다. 다른 브라우저나 기기에는 자동으로 복사되지 않습니다." : "This data can be lost if browser data is cleared, private browsing ends, or the device is reset. It is not copied to other browsers or devices."}</aside>
    {active && <section className="panel guestTimer"><span>{locale === "ko" ? "집중 중" : "Focusing"}</span><strong>{duration(activeSeconds, locale)}</strong><button className="button" onClick={stop}>{locale === "ko" ? "집중 종료" : "Stop focus"}</button></section>}
    <div className="guestGrid">
      <section className="panel"><div className="sectionTitle"><h2>Inbox</h2><span>{tasks.length}</span></div>
        <form className="rowForm" onSubmit={event => { event.preventDefault(); void createTask(); }}><input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required placeholder={locale === "ko" ? "새 작업" : "New task"}/><button className="button secondary">{locale === "ko" ? "추가" : "Add"}</button></form>
        <div className="guestTaskList">{tasks.map(task => <article key={task.localId}><strong>{task.title}</strong><div><button className="textButton accent" onClick={() => schedule(task)}>{locale === "ko" ? "오늘 추가" : "Add today"}</button><label className="guestDate"><span>{locale === "ko" ? "날짜" : "Date"}</span><input type="date" min={today()} defaultValue={today()} aria-label={`${task.title} ${locale === "ko" ? "날짜 지정" : "schedule date"}`} onChange={event => void schedule(task, event.target.value)}/></label><button className="textButton dangerText" onClick={async () => { if (items.some(item => item.taskLocalId === task.localId)) return; await deleteGuest("tasks", task.localId); await reload(); }}>{locale === "ko" ? "삭제" : "Delete"}</button></div></article>)}</div>
      </section>
      <section className="panel"><div className="sectionTitle"><h2>{locale === "ko" ? "오늘" : "Today"}</h2><span>{todayItems.length}</span></div>
        <div className="guestTaskList">{todayItems.map(item => {
          const focused = sessions.filter(session => session.itemLocalId === item.localId).reduce((sum, session) => sum + (session.durationSeconds ?? (session.localId === activeId ? activeSeconds : 0)), 0);
          return <article key={item.localId} className={item.status === "completed" ? "done" : ""}><div><strong>{item.title}</strong><small>{locale === "ko" ? "목표" : "Goal"} {item.dailyGoalMinutes ?? "—"}m · {locale === "ko" ? "집중" : "Focused"} {duration(focused, locale)}</small></div><div>
            <input className="guestGoal" type="number" min="1" max="1440" value={item.dailyGoalMinutes ?? ""} aria-label={locale === "ko" ? "목표 시간" : "Goal time"} onChange={event => void updateItem(item, { dailyGoalMinutes: event.target.value ? Number(event.target.value) : null })}/>
            {item.status === "planned" && <button className="textButton accent" disabled={Boolean(activeId)} onClick={() => start(item)}>{locale === "ko" ? "집중" : "Focus"}</button>}
            <button className="textButton" onClick={() => updateItem(item, { status: item.status === "completed" ? "planned" : "completed", completedAt: item.status === "completed" ? null : now() })}>{item.status === "completed" ? (locale === "ko" ? "완료 취소" : "Undo") : (locale === "ko" ? "완료" : "Complete")}</button>
            <button className="textButton" disabled={active?.itemLocalId === item.localId} onClick={() => removeItem(item)}>{locale === "ko" ? "오늘에서 빼기" : "Remove today"}</button>
          </div></article>;
        })}</div>
      </section>
    </div>
    <section className="panel guestUpcoming"><div className="sectionTitle"><h2>{locale === "ko" ? "예정" : "Upcoming"}</h2><span>{upcomingItems.length}</span></div><div className="guestTaskList">{upcomingItems.map(item => <article key={item.localId}><div><strong>{item.title}</strong><small>{item.date}</small></div><button className="textButton" onClick={() => removeItem(item)}>{locale === "ko" ? "일정 해제" : "Clear date"}</button></article>)}</div>{!upcomingItems.length && <p className="columnEmpty">{locale === "ko" ? "예정된 작업이 없습니다." : "No upcoming tasks."}</p>}</section>
  </main>;
}
