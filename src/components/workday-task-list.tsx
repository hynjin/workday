"use client";

import { useRef, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { removeWorkdayItem, reorderWorkdayItem, startFocus, toggleItemComplete } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { TaskEditDialog } from "@/components/task-edit-dialog";
import { WorkdayIcon } from "@/components/workday-icon";

type WorkItem = {
  id: string;
  taskId: string | null;
  title: string;
  status: "planned" | "completed";
  seconds: number;
  sessionCount: number;
  projectTitle: string | null;
  locationColor: string;
  priority: "low" | "normal" | "high";
  parentTitle: string | null;
  estimatedMinutes: number | null;
  dailyGoalMinutes: number | null;
  projectId: string | null;
  areaId: string | null;
  repeat: "none" | "daily" | "weekly" | "monthly";
};

export function WorkdayTaskList({ items, locale, actionable, planning, selectedDate, projects, areas }: {
  items: WorkItem[];
  locale: Locale;
  actionable: boolean;
  planning: boolean;
  selectedDate: string;
  projects: { id: string; title: string; color: string }[];
  areas: { id: string; title: string; color: string }[];
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

  return <div className="wd-task-list" aria-busy={pending}>{items.map((item, index) => <article className={`wd-task ${item.status === "completed" ? "is-done" : ""}`} key={item.id} onDragOver={event => reorderable && event.preventDefault()} onDrop={event => reorderable && drop(event, index)}>
    {actionable && <form action={toggleItemComplete} className="wd-completion-form"><input type="hidden" name="itemId" value={item.id}/><button className="wd-check" aria-label={item.status === "completed" ? (locale === "ko" ? "완료 취소" : "Undo completion") : (locale === "ko" ? "작업 완료" : "Complete task")}>{item.status === "completed" && <WorkdayIcon name="check" size={14}/>}</button></form>}
    {reorderable && <span className="wd-drag-handle" draggable onDragStart={event => { dragging.current = item.id; event.dataTransfer.effectAllowed = "move"; }} role="button" tabIndex={0} aria-label={locale === "ko" ? "끌어서 실행 순서 변경" : "Drag to reorder"}><WorkdayIcon name="grip" size={14}/></span>}
    <div className="wd-task-body"><div className="wd-task-title">{actionable && item.status !== "completed" ? <form action={startFocus}><input type="hidden" name="itemId" value={item.id}/><button title={locale === "ko" ? "작업을 누르면 집중을 시작해요" : "Select the task to start focusing"}>{item.title}</button></form> : <h3>{item.title}</h3>}</div><p className="wd-task-meta"><i className={`wd-dot ${item.locationColor}`}/>{item.parentTitle ? `${item.parentTitle} › ` : ""}{item.projectTitle ?? (item.taskId ? (locale === "ko" ? "수집함" : "Inbox") : (locale === "ko" ? "하루 작업" : "One-off"))} · {locale === "ko" ? "목표" : "Goal"} {item.dailyGoalMinutes ? `${item.dailyGoalMinutes}m` : "—"} <span className="wd-play-cue" aria-hidden="true">▶</span></p>
    </div>
    {(actionable || planning) && <div className="wd-task-actions"><span className={`wd-priority ${item.priority}`}>{item.priority === "low" ? (locale === "ko" ? "낮음" : "Low") : item.priority === "normal" ? (locale === "ko" ? "보통" : "Normal") : (locale === "ko" ? "높음" : "High")}</span>
      <details className="wd-more-menu"><summary aria-label={locale === "ko" ? "작업 메뉴" : "Task menu"}><WorkdayIcon name="more"/></summary><div>
        {item.taskId && <TaskEditDialog task={{ id:item.taskId, title:item.title, priority:item.priority, estimatedMinutes:item.estimatedMinutes, projectId:item.projectId, areaId:item.areaId, scheduledItem:{id:item.id,date:selectedDate}, repeat:item.repeat }} projects={projects} areas={areas} locale={locale}/>}
        {(planning || actionable) && <form action={removeWorkdayItem}><input type="hidden" name="itemId" value={item.id}/><button className="textButton">{actionable ? (locale === "ko" ? "오늘에서 빼기" : "Remove from today") : (locale === "ko" ? "일정 해제" : "Clear date")}</button></form>}
        {actionable && <><button type="button" className="textButton" disabled={index === 0 || pending} onClick={() => move(item.id, index - 1)}>{locale === "ko" ? "위로 이동" : "Move up"}</button><button type="button" className="textButton" disabled={index === items.length - 1 || pending} onClick={() => move(item.id, index + 1)}>{locale === "ko" ? "아래로 이동" : "Move down"}</button></>}
      </div></details>
    </div>}
  </article>)}</div>;
}
