"use client";

import { useRef, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { archiveTask, createSubtask, deleteSection, deleteTask, moveProjectSection, moveProjectTask, moveTaskToProject, scheduleTaskForDate, updateSection, updateTask } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { ConfirmSubmit, EditableText } from "./editable-text";
import { TaskPlanningFields } from "./task-planning-fields";
import { dateKeyToDate, getWorkdayDate, nextDate } from "@/lib/workday-date";

type Rule = {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  weekdays: number[];
  monthDay: number | null;
  startsOn: string;
  endsOn: string | null;
};

type ProjectTask = {
  id: string;
  title: string;
  sectionId: string | null;
  sortOrder: number;
  estimatedMinutes: number | null;
  focusSeconds: number;
  sessionCount: number;
  recurrenceRule: Rule | null;
  subtasks: { id: string; title: string }[];
};

type ProjectSection = {
  id: string;
  title: string;
  sortOrder: number;
};

type DragItem = { kind: "task" | "section"; id: string };

function duration(seconds: number, locale: Locale) {
  if (seconds < 60) return locale === "ko" ? `${seconds}초` : `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return locale === "ko" ? `${minutes}분` : `${minutes}m`;
}

export function ProjectTaskBoard({ projectId, viewMode, sections, tasks, locale, reorderEnabled }: {
  projectId: string;
  viewMode: "list" | "board";
  sections: ProjectSection[];
  tasks: ProjectTask[];
  locale: Locale;
  reorderEnabled: boolean;
}) {
  const router = useRouter();
  const today = getWorkdayDate();
  const tomorrow = nextDate(dateKeyToDate(today)).toISOString().slice(0, 10);
  const [pending, startTransition] = useTransition();
  const dragging = useRef<DragItem | null>(null);
  const columns = [
    { id: null, title: locale === "ko" ? "섹션 없음" : "No section", sortOrder: -1 },
    ...sections,
  ];

  const runTaskMove = (taskId: string, sectionId: string | null, targetIndex: number) => {
    startTransition(async () => {
      await moveProjectTask(taskId, sectionId, targetIndex);
      router.refresh();
    });
  };
  const runSectionMove = (sectionId: string, targetIndex: number) => {
    startTransition(async () => {
      await moveProjectSection(projectId, sectionId, targetIndex);
      router.refresh();
    });
  };
  const beginDrag = (event: DragEvent, item: DragItem) => {
    if (!reorderEnabled) return;
    dragging.current = item;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
    if (item.kind === "task") event.stopPropagation();
  };
  const allowDrop = (event: DragEvent) => {
    if (!reorderEnabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };
  const dropOnColumn = (event: DragEvent, sectionId: string | null, sectionIndex: number, taskCount: number) => {
    event.preventDefault();
    const item = dragging.current;
    dragging.current = null;
    if (!item || !reorderEnabled) return;
    if (item.kind === "task") runTaskMove(item.id, sectionId, taskCount);
    else if (sectionId) runSectionMove(item.id, Math.max(0, sectionIndex - 1));
  };
  const dropOnTask = (event: DragEvent, sectionId: string | null, targetIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    const item = dragging.current;
    dragging.current = null;
    if (item?.kind === "task" && reorderEnabled) runTaskMove(item.id, sectionId, targetIndex);
  };

  return <div className={`projectTaskBoard ${viewMode}`} aria-busy={pending}>
    {!reorderEnabled && <p className="reorderNotice">{locale === "ko" ? "드래그와 이동 버튼은 ‘기본 순서’에서 사용할 수 있습니다." : "Drag and move controls are available in Default order."}</p>}
    <div className="projectColumns">
      {columns.map((column, columnIndex) => {
        const columnTasks = tasks.filter(task => task.sectionId === column.id);
        return <section
          className={`projectColumn ${column.id ? "" : "unsectioned"}`}
          key={column.id ?? "unsectioned"}
          draggable={Boolean(column.id && reorderEnabled)}
          onDragStart={event => column.id && beginDrag(event, { kind: "section", id: column.id })}
          onDragOver={allowDrop}
          onDrop={event => dropOnColumn(event, column.id, columnIndex, columnTasks.length)}
        >
          <header className="projectColumnHeader">
            {column.id
              ? <EditableText action={updateSection} idName="sectionId" id={column.id} value={column.title} label={locale === "ko" ? "섹션 이름 수정" : "Rename section"}/>
              : <strong>{column.title}</strong>}
            <span>{columnTasks.length}</span>
            {column.id && <div className="columnActions">
              <button type="button" className="moveIcon" disabled={!reorderEnabled || columnIndex === 1 || pending} onClick={() => runSectionMove(column.id!, columnIndex - 2)} aria-label={locale === "ko" ? "섹션을 왼쪽으로" : "Move section left"}>←</button>
              <button type="button" className="moveIcon" disabled={!reorderEnabled || columnIndex === columns.length - 1 || pending} onClick={() => runSectionMove(column.id!, columnIndex)} aria-label={locale === "ko" ? "섹션을 오른쪽으로" : "Move section right"}>→</button>
              <ConfirmSubmit action={deleteSection} fields={{ sectionId: column.id }} message={locale === "ko" ? `‘${column.title}’ 섹션을 삭제할까요? 작업은 섹션 없음으로 이동합니다.` : `Delete “${column.title}”? Tasks move to No section.`}><button className="moveIcon dangerText" aria-label={locale === "ko" ? "섹션 삭제" : "Delete section"}>×</button></ConfirmSubmit>
            </div>}
          </header>
          <div className="projectColumnTasks">
            {columnTasks.map((task, taskIndex) => <article
              className="projectTaskCard"
              key={task.id}
              draggable={reorderEnabled}
              onDragStart={event => beginDrag(event, { kind: "task", id: task.id })}
              onDragOver={allowDrop}
              onDrop={event => dropOnTask(event, column.id, taskIndex)}
            >
              <EditableText action={updateTask} idName="taskId" id={task.id} value={task.title} label={locale === "ko" ? "작업 이름 수정" : "Rename task"}/>
              <p>{task.estimatedMinutes ? `${locale === "ko" ? "예상" : "Est."} ${task.estimatedMinutes}${locale === "ko" ? "분" : "m"} · ` : ""}{locale === "ko" ? "집중" : "Focus"} {duration(task.focusSeconds, locale)} · {task.sessionCount}{locale === "ko" ? "회" : ""}</p>
              <div className="cardMoveActions">
                <button type="button" className="moveIcon" disabled={!reorderEnabled || taskIndex === 0 || pending} onClick={() => runTaskMove(task.id, column.id, taskIndex - 1)} aria-label={locale === "ko" ? "작업을 위로" : "Move task up"}>↑</button>
                <button type="button" className="moveIcon" disabled={!reorderEnabled || taskIndex === columnTasks.length - 1 || pending} onClick={() => runTaskMove(task.id, column.id, taskIndex + 1)} aria-label={locale === "ko" ? "작업을 아래로" : "Move task down"}>↓</button>
                <button type="button" className="moveIcon" disabled={!reorderEnabled || columnIndex === 0 || pending} onClick={() => runTaskMove(task.id, columns[columnIndex - 1].id, 0)} aria-label={locale === "ko" ? "이전 섹션으로" : "Move to previous section"}>←</button>
                <button type="button" className="moveIcon" disabled={!reorderEnabled || columnIndex === columns.length - 1 || pending} onClick={() => runTaskMove(task.id, columns[columnIndex + 1].id, 0)} aria-label={locale === "ko" ? "다음 섹션으로" : "Move to next section"}>→</button>
              </div>
              <div className="cardTaskActions">
                <form action={moveTaskToProject}><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="projectId" value=""/><button className="textButton accent">{locale === "ko" ? "받은편지함" : "Inbox"}</button></form>
                <form action={archiveTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton muted">{locale === "ko" ? "보관" : "Archive"}</button></form>
                <ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={locale === "ko" ? `‘${task.title}’ 작업을 삭제할까요?` : `Delete “${task.title}”?`}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit>
              </div>
              <TaskPlanningFields taskId={task.id} estimatedMinutes={task.estimatedMinutes} rule={task.recurrenceRule} locale={locale}/>
              <details className="subtaskGroup compact">
                <summary>{locale === "ko" ? "하위 작업" : "Subtasks"} <span>{task.subtasks.length}</span></summary>
                <div className="subtaskList">{task.subtasks.map(subtask => <div className="subtaskRow" key={subtask.id}><EditableText action={updateTask} idName="taskId" id={subtask.id} value={subtask.title} label={locale === "ko" ? "하위 작업 이름 수정" : "Rename subtask"}/><div className="subtaskActions"><form action={scheduleTaskForDate}><input type="hidden" name="taskId" value={subtask.id}/><input type="hidden" name="date" value={today}/><button className="textButton accent">{locale === "ko" ? "오늘" : "Today"}</button></form><form action={scheduleTaskForDate}><input type="hidden" name="taskId" value={subtask.id}/><input type="hidden" name="date" value={tomorrow}/><button className="textButton accent">{locale === "ko" ? "내일" : "Tomorrow"}</button></form><ConfirmSubmit action={deleteTask} fields={{ taskId: subtask.id }} message={locale === "ko" ? `‘${subtask.title}’ 하위 작업을 삭제할까요?` : `Delete subtask “${subtask.title}”?`}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit></div></div>)}</div>
                <form action={createSubtask} className="subtaskCreate"><input type="hidden" name="parentTaskId" value={task.id}/><input name="title" required maxLength={120} placeholder={locale === "ko" ? "새 하위 작업" : "New subtask"} aria-label={locale === "ko" ? "새 하위 작업 이름" : "New subtask name"}/><button className="textButton accent">{locale === "ko" ? "추가" : "Add"}</button></form>
              </details>
            </article>)}
            {!columnTasks.length && <p className="columnEmpty">{locale === "ko" ? "작업을 여기로 끌어오세요." : "Drag tasks here."}</p>}
          </div>
        </section>;
      })}
    </div>
  </div>;
}
