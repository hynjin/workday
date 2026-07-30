"use client";

import { useRef, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { archiveTask, deleteSection, deleteTask, moveProjectSection, moveProjectTask } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { ConfirmSubmit } from "./editable-text";
import { TaskSchedulePicker } from "./task-schedule-picker";
import { TaskEditDialog } from "./task-edit-dialog";
import { EditSectionDialog } from "./project-dialogs";
import { WorkdayIcon } from "./workday-icon";

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
  priority: "low" | "normal" | "high";
  focusSeconds: number;
  sessionCount: number;
  recurrenceRule: Rule | null;
  scheduledItem: { id: string; date: string } | null;
  subtasks: { id: string; title: string; scheduledItem: { id: string; date: string } | null }[];
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

export function ProjectTaskBoard({ projectId, viewMode, sections, tasks, locale, reorderEnabled, projects, areas }: {
  projectId: string;
  viewMode: "list" | "board";
  sections: ProjectSection[];
  tasks: ProjectTask[];
  locale: Locale;
  reorderEnabled: boolean;
  projects: { id: string; title: string; color: string }[];
  areas: { id: string; title: string; color: string }[];
}) {
  const router = useRouter();
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

  return <div className={`wd-board ${viewMode}`} aria-busy={pending}>
    {!reorderEnabled && <p className="wd-board-notice">{locale === "ko" ? "기본 순서에서 드래그할 수 있어요." : "Use default order to drag items."}</p>}
    <div className="wd-board-columns">
      {columns.map((column, columnIndex) => {
        const columnTasks = tasks.filter(task => task.sectionId === column.id);
        return <section
          className={`wd-board-column ${column.id ? "" : "is-unsectioned"}`}
          key={column.id ?? "unsectioned"}
          onDragOver={allowDrop}
          onDrop={event => dropOnColumn(event, column.id, columnIndex, columnTasks.length)}
        >
          <header className="wd-board-column-head">
            {column.id && <span className="wd-board-drag" draggable={reorderEnabled} onDragStart={event => beginDrag(event, { kind: "section", id: column.id! })} aria-label={locale === "ko" ? "섹션 끌어서 이동" : "Drag to move section"} role="button" tabIndex={0}><WorkdayIcon name="grip" size={15}/></span>}
            <strong>{column.title}</strong>
            <span>{columnTasks.length}</span>
            {column.id && <details className="wd-more-menu"><summary aria-label={locale === "ko" ? "섹션 메뉴" : "Section menu"}><WorkdayIcon name="more"/></summary><div>
              <EditSectionDialog section={{id:column.id,title:column.title}} locale={locale}/>
              <button type="button" className="textButton" disabled={!reorderEnabled || columnIndex === 1 || pending} onClick={() => runSectionMove(column.id!, columnIndex - 2)}>{locale === "ko" ? "왼쪽으로 이동" : "Move left"}</button>
              <button type="button" className="textButton" disabled={!reorderEnabled || columnIndex === columns.length - 1 || pending} onClick={() => runSectionMove(column.id!, columnIndex)}>{locale === "ko" ? "오른쪽으로 이동" : "Move right"}</button>
              <ConfirmSubmit action={deleteSection} fields={{ sectionId: column.id }} message={locale === "ko" ? `‘${column.title}’ 섹션을 삭제할까요? 작업은 섹션 없음으로 이동합니다.` : `Delete “${column.title}”? Tasks move to No section.`}><button className="dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit>
            </div></details>}
          </header>
          <div className="wd-board-cards">
            {columnTasks.map((task, taskIndex) => <article
              className="wd-board-card"
              key={task.id}
              onDragOver={allowDrop}
              onDrop={event => dropOnTask(event, column.id, taskIndex)}
            >
              <div className="wd-board-card-head"><span className="wd-board-drag" draggable={reorderEnabled} onDragStart={event => beginDrag(event, { kind: "task", id: task.id })} aria-label={locale === "ko" ? "작업 끌어서 이동" : "Drag to move task"} role="button" tabIndex={0}><WorkdayIcon name="grip" size={15}/></span><strong>{task.title}</strong><details className="wd-more-menu"><summary aria-label={locale === "ko" ? "작업 메뉴" : "Task menu"}><WorkdayIcon name="more"/></summary><div>
                  <TaskEditDialog task={{ id:task.id,title:task.title,priority:task.priority,estimatedMinutes:task.estimatedMinutes,projectId,areaId:null,scheduledItem:task.scheduledItem,repeat:task.recurrenceRule?.frequency ?? "none" }} projects={projects} areas={areas} locale={locale}/>
                  <button type="button" className="textButton" disabled={!reorderEnabled || taskIndex === 0 || pending} onClick={() => runTaskMove(task.id, column.id, taskIndex - 1)}>{locale === "ko" ? "위로 이동" : "Move up"}</button>
                  <button type="button" className="textButton" disabled={!reorderEnabled || taskIndex === columnTasks.length - 1 || pending} onClick={() => runTaskMove(task.id, column.id, taskIndex + 1)}>{locale === "ko" ? "아래로 이동" : "Move down"}</button>
                  <button type="button" className="textButton" disabled={!reorderEnabled || columnIndex === 0 || pending} onClick={() => runTaskMove(task.id, columns[columnIndex - 1].id, 0)}>{locale === "ko" ? "이전 섹션" : "Previous section"}</button>
                  <button type="button" className="textButton" disabled={!reorderEnabled || columnIndex === columns.length - 1 || pending} onClick={() => runTaskMove(task.id, columns[columnIndex + 1].id, 0)}>{locale === "ko" ? "다음 섹션" : "Next section"}</button>
                  <form action={archiveTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton muted">{locale === "ko" ? "보관" : "Archive"}</button></form>
                  <ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={locale === "ko" ? `‘${task.title}’ 작업을 삭제할까요?` : `Delete “${task.title}”?`}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit>
                </div></details></div>
              <div className="wd-board-card-meta"><span className={`wd-priority ${task.priority}`}>{task.priority === "low" ? (locale === "ko" ? "낮음" : "Low") : task.priority === "normal" ? (locale === "ko" ? "보통" : "Normal") : (locale === "ko" ? "높음" : "High")}</span><span>{task.estimatedMinutes ? `${task.estimatedMinutes}${locale === "ko" ? "분" : "m"} · ` : ""}{locale === "ko" ? "집중" : "Focus"} {duration(task.focusSeconds, locale)}</span></div>
              <div className="wd-board-card-foot"><span>{task.subtasks.length ? (locale === "ko" ? `하위 ${task.subtasks.length}` : `${task.subtasks.length} subtasks`) : ""}</span><TaskSchedulePicker taskId={task.id} locale={locale} compact scheduledItem={task.scheduledItem}/></div>
            </article>)}
            {!columnTasks.length && <p className="wd-board-empty">{locale === "ko" ? "작업을 여기로 끌어오세요." : "Drag tasks here."}</p>}
          </div>
        </section>;
      })}
    </div>
  </div>;
}
