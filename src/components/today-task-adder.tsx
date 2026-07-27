"use client";

import { useMemo, useState } from "react";
import { addWorkdayItem, createTodayTask } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";

type Candidate = { id: string; title: string; location: string };

export function TodayTaskAdder({ workdayId, candidates, locale }: { workdayId: string; candidates: Candidate[]; locale: Locale }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase();
  const matches = useMemo(() => normalized
    ? candidates.filter(task => `${task.title} ${task.location}`.toLocaleLowerCase().includes(normalized)).slice(0, 8)
    : candidates.slice(0, 8), [candidates, normalized]);

  return <details className="todayAdder">
    <summary>{locale === "ko" ? "오늘 작업 추가" : "Add today’s task"}</summary>
    <div className="todayAdderPanel">
      <label><span>{locale === "ko" ? "기존 작업 검색" : "Find an existing task"}</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={locale === "ko" ? "Inbox, Area, Project 작업 검색" : "Search Inbox, Area, and Project tasks"} autoComplete="off"/></label>
      <div className="todayCandidateList">{matches.map(task => <form action={addWorkdayItem} key={task.id}><input type="hidden" name="workdayId" value={workdayId}/><input type="hidden" name="taskId" value={task.id}/><span><strong>{task.title}</strong><small>{task.location}</small></span><button className="textButton accent">{locale === "ko" ? "오늘 추가" : "Add today"}</button></form>)}</div>
      {normalized && !matches.length && <p className="columnEmpty">{locale === "ko" ? "일치하는 기존 작업이 없습니다. 아래에서 새 작업으로 만드세요." : "No existing task matches. Create it below."}</p>}
      <form action={createTodayTask} className="todayCreateForm">
        <input type="hidden" name="workdayId" value={workdayId}/>
        <label><span>{locale === "ko" ? "새 작업" : "New task"}</span><input name="title" required maxLength={120} value={query} onChange={event => setQuery(event.target.value)} placeholder={locale === "ko" ? "새 Inbox 작업 이름" : "New Inbox task name"}/></label>
        <label><span>{locale === "ko" ? "오늘 목표(분)" : "Daily goal (min)"}</span><input name="estimatedMinutes" type="number" min="1" max="1440" placeholder="—"/></label>
        <button className="button secondary">{locale === "ko" ? "만들고 오늘 추가" : "Create and add today"}</button>
      </form>
    </div>
  </details>;
}
