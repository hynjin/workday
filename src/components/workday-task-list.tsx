"use client";

import { useRef, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { reorderWorkdayItem, saveWorkdayItemToLibrary, startFocus, toggleItemComplete } from "@/lib/actions";
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
};

export function WorkdayTaskList({ items, locale, actionable, planning, historical }: {
  items: WorkItem[];
  locale: Locale;
  actionable: boolean;
  planning: boolean;
  historical: boolean;
}) {
  const router = useRouter();
  const dragging = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();
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

  return <div className="workList" aria-busy={pending}>{items.map((item, index) => <article className={`workItem ${item.status === "completed" ? "done" : ""}`} key={item.id} onDragOver={event => actionable && event.preventDefault()} onDrop={event => actionable && drop(event, index)}>
    {actionable && <span className="dragHandle workdayDragHandle" draggable onDragStart={event => { dragging.current = item.id; event.dataTransfer.effectAllowed = "move"; }} role="button" tabIndex={0} aria-label={locale === "ko" ? "끌어서 실행 순서 변경" : "Drag to reorder"}>⠿</span>}
    <div className="workItemBody"><div className="taskTitleLine"><h3>{item.title}</h3><span className="itemCategory">{item.parentTitle ? `${item.parentTitle} › ` : ""}{item.projectTitle ?? (item.taskId ? (locale === "ko" ? "받은편지함" : "Inbox") : (locale === "ko" ? "하루 작업" : "One-off"))}</span></div><p>{formatDuration(item.seconds, false, locale)} · {item.sessionCount} {locale === "ko" ? "회 집중" : "sessions"}{item.estimatedMinutes ? ` · ${locale === "ko" ? "예상" : "Est."} ${item.estimatedMinutes}${locale === "ko" ? "분" : "m"}` : ""}</p>
      {!item.taskId && !historical && <form action={saveWorkdayItemToLibrary} className="promoteForm"><input type="hidden" name="itemId" value={item.id}/><button className="textButton accent">{locale === "ko" ? "받은편지함에 저장" : "Save to Inbox"}</button></form>}
    </div>
    {(actionable || planning) && <div className="actions">{actionable && <>{item.status !== "completed" && <form action={startFocus}><input type="hidden" name="itemId" value={item.id}/><button className="button secondary">{locale === "ko" ? "집중 시작" : "Start focus"}</button></form>}<form action={toggleItemComplete}><input type="hidden" name="itemId" value={item.id}/><button className="button">{item.status === "completed" ? (locale === "ko" ? "완료 취소" : "Undo") : (locale === "ko" ? "완료" : "Complete")}</button></form></>}<details className="moreMenu"><summary aria-label={locale === "ko" ? "순서 이동 메뉴" : "Reorder menu"}>⋯</summary><div><button type="button" className="textButton" disabled={!actionable || index === 0 || pending} onClick={() => move(item.id, index - 1)}>{locale === "ko" ? "위로 이동" : "Move up"}</button><button type="button" className="textButton" disabled={!actionable || index === items.length - 1 || pending} onClick={() => move(item.id, index + 1)}>{locale === "ko" ? "아래로 이동" : "Move down"}</button></div></details></div>}
  </article>)}</div>;
}
