"use client";

import { useRef, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { moveWorkdayItem, removeWorkdayItem, reorderWorkdayItem, saveWorkdayItemToLibrary, startFocus, toggleItemComplete, updateDailyGoal } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { formatDuration } from "@/lib/workday-date";

type WorkItem = {
  id: string;
  taskId: string | null;
  title: string;
  status: "planned" | "completed";
  seconds: number;
  sessionCount: number;
  projectTitle: string | null;
  parentTitle: string | null;
  estimatedMinutes: number | null;
  dailyGoalMinutes: number | null;
};

export function WorkdayTaskList({ items, locale, actionable, planning, historical, selectedDate }: {
  items: WorkItem[];
  locale: Locale;
  actionable: boolean;
  planning: boolean;
  historical: boolean;
  selectedDate: string;
}) {
  const router = useRouter();
  const dragging = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reorderable = actionable;
  const move = (id: string, index: number) => startTransition(async () => {
    await reorderWorkdayItem(id, index);
    router.refresh();
  });
  const drop = (event: DragEvent, index: number) => {
    event.preventDefault();
    const id = dragging.current;
    dragging.current = null;
    if (id) move(id, index);
  };

  return <div className="workList" aria-busy={pending}>{items.map((item, index) => <article className={`workItem ${item.status === "completed" ? "done" : ""}`} key={item.id} onDragOver={event => reorderable && event.preventDefault()} onDrop={event => reorderable && drop(event, index)}>
    {reorderable && <span className="dragHandle workdayDragHandle" draggable onDragStart={event => { dragging.current = item.id; event.dataTransfer.effectAllowed = "move"; }} role="button" tabIndex={0} aria-label={locale === "ko" ? "끌어서 실행 순서 변경" : "Drag to reorder"}>⠿</span>}
    <div className="workItemBody"><div className="taskTitleLine"><h3>{item.title}</h3><span className="itemCategory">{item.parentTitle ? `${item.parentTitle} › ` : ""}{item.projectTitle ?? (item.taskId ? "Inbox" : (locale === "ko" ? "하루 작업" : "One-off"))}</span></div><p>{locale === "ko" ? "목표" : "Goal"} {item.dailyGoalMinutes ? `${item.dailyGoalMinutes}m` : "—"} · {locale === "ko" ? "집중" : "Focused"} {formatDuration(item.seconds, false, locale)} · {item.sessionCount} {locale === "ko" ? "회" : "sessions"}</p>
      {!historical && <form action={updateDailyGoal} className="dailyGoalForm"><input type="hidden" name="itemId" value={item.id}/><label><span>{locale === "ko" ? "오늘 목표(분)" : "Daily goal (min)"}</span><input type="number" name="estimatedMinutes" min="1" max="1440" defaultValue={item.dailyGoalMinutes ?? ""} placeholder="—"/></label><button className="textButton">{locale === "ko" ? "저장" : "Save"}</button></form>}
      {!item.taskId && !historical && <form action={saveWorkdayItemToLibrary} className="promoteForm"><input type="hidden" name="itemId" value={item.id}/><button className="textButton accent">{locale === "ko" ? "받은편지함에 저장" : "Save to Inbox"}</button></form>}
    </div>
    {(actionable || planning) && <div className="actions">
      {actionable && <>{item.status !== "completed" && <form action={startFocus}><input type="hidden" name="itemId" value={item.id}/><button className="button secondary">{locale === "ko" ? "집중 시작" : "Start focus"}</button></form>}<form action={toggleItemComplete}><input type="hidden" name="itemId" value={item.id}/><button className="button">{item.status === "completed" ? (locale === "ko" ? "완료 취소" : "Undo") : (locale === "ko" ? "완료" : "Complete")}</button></form></>}
      <details className="moreMenu"><summary aria-label={locale === "ko" ? "작업 메뉴" : "Task menu"}>⋯</summary><div>
        {(planning || actionable) && <><form action={moveWorkdayItem}><input type="hidden" name="itemId" value={item.id}/><input type="date" name="date" defaultValue={selectedDate} aria-label={locale === "ko" ? "다른 날짜로 이동" : "Move to another date"}/><button className="textButton accent">{locale === "ko" ? "날짜 변경" : "Change date"}</button></form><form action={removeWorkdayItem}><input type="hidden" name="itemId" value={item.id}/><button className="textButton">{actionable ? (locale === "ko" ? "오늘에서 빼기" : "Remove from today") : (locale === "ko" ? "일정 해제" : "Clear date")}</button></form></>}
        {actionable && <><button type="button" className="textButton" disabled={index === 0 || pending} onClick={() => move(item.id, index - 1)}>{locale === "ko" ? "위로 이동" : "Move up"}</button><button type="button" className="textButton" disabled={index === items.length - 1 || pending} onClick={() => move(item.id, index + 1)}>{locale === "ko" ? "아래로 이동" : "Move down"}</button></>}
      </div></details>
    </div>}
  </article>)}</div>;
}
