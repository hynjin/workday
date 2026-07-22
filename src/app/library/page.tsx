import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit, EditableText } from "@/components/editable-text";
import { addWorkdayItem, archiveCategory, archiveTask, createCategory, createTask, deleteCategory, deleteTask, removeWorkdayItem, restoreCategory, restoreTask, updateCategory, updateTask } from "@/lib/actions";
import { getOrCreateWorkdayForDate, getWorkdayView } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate, formatWorkdayDate, getWorkdayDate, nextDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const todayKey = getWorkdayDate();
  const selectedKey = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= todayKey ? date : todayKey;
  const tomorrowKey = nextDate(dateKeyToDate(todayKey)).toISOString().slice(0, 10);
  const workday = await getOrCreateWorkdayForDate(selectedKey);
  const [view, activeCategories, archivedCategories, archivedTasks] = await Promise.all([
    getWorkdayView(workday.id),
    prisma.taskCategory.findMany({ where: { status: "active" }, orderBy: { createdAt: "asc" }, include: { tasks: { where: { status: "active" }, orderBy: { createdAt: "asc" } } } }),
    prisma.taskCategory.findMany({ where: { status: "archived" }, orderBy: { archivedAt: "desc" } }),
    prisma.task.findMany({ where: { status: "archived", category: { status: "active" } }, orderBy: { archivedAt: "desc" }, include: { category: true } }),
  ]);
  const selectedLabel = selectedKey === todayKey ? "오늘" : formatWorkdayDate(view.workdayDate);
  return <main className="shell">
    <AppNav />
    <header className="pageHeader"><div><p className="eyebrow">언제든 수정 가능</p><h1>전체 목록 · 작업 준비</h1><p className="lede">카테고리별 반복 작업을 정리하고, 오늘이나 미래 날짜에 할 일을 골라 계획하세요.</p></div><span className="status">{selectedLabel} {view.items.length}개</span></header>
    <section className="panel datePlanner"><div><strong>계획할 날짜</strong><p>날짜를 바꾸면 오른쪽 작업 목록도 함께 바뀝니다.</p></div><form><input type="date" name="date" min={todayKey} defaultValue={selectedKey}/><button className="button secondary">날짜 보기</button></form><div className="dateQuick"><Link href="/library">오늘</Link><Link href={`/library?date=${tomorrowKey}`}>내일</Link></div></section>
    <div className="libraryGrid">
      <section className="libraryMain">
        <form action={createCategory} className="rowForm categoryCreate"><label className="sr-only" htmlFor="category-title">새 카테고리</label><input id="category-title" name="title" placeholder="새 카테고리 (예: 영어, 프로젝트)" required maxLength={120}/><button className="button">카테고리 추가</button></form>
        {activeCategories.map((category, index) => <details className="panel categoryCard" key={category.id} open={index === 0}>
          <summary className="categorySummary"><strong>{category.title}</strong><span>{category.tasks.length}개</span></summary>
          <div className="categoryBody">
            <div className="categoryHeader"><EditableText action={updateCategory} idName="categoryId" id={category.id} value={category.title} label="카테고리 이름" className="categoryName"/><div className="libraryActions"><form action={archiveCategory}><input type="hidden" name="categoryId" value={category.id}/><button className="textButton muted">보관</button></form><ConfirmSubmit action={deleteCategory} fields={{ categoryId: category.id }} message={`‘${category.title}’ 카테고리와 그 안의 세부 작업을 삭제할까요? 작업일 기록은 유지됩니다.`}><button className="textButton dangerText">삭제</button></ConfirmSubmit></div></div>
            <div className="taskRows">{category.tasks.map(task => <div className="libraryTask" key={task.id}><EditableText action={updateTask} idName="taskId" id={task.id} value={task.title} label="세부 작업 이름"/><div className="libraryActions"><form action={addWorkdayItem}><input type="hidden" name="workdayId" value={view.id}/><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="title" value={task.title}/><button className="textButton accent">{selectedKey === todayKey ? "오늘 추가" : "이 날짜에 추가"}</button></form><form action={archiveTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton muted">보관</button></form><ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={`‘${task.title}’을 전체 목록에서 삭제할까요? 기존 작업일 기록은 유지됩니다.`}><button className="textButton dangerText">삭제</button></ConfirmSubmit></div></div>)}</div>
            <details className="addDetail"><summary>+ 세부 작업 추가</summary><form action={createTask} className="rowForm detailCreate"><input type="hidden" name="categoryId" value={category.id}/><label className="sr-only" htmlFor={`new-task-${category.id}`}>세부 작업 추가</label><input id={`new-task-${category.id}`} name="title" placeholder={`${category.title}의 세부 작업`} required/><button className="button secondary">추가</button></form></details>
          </div>
        </details>)}
        {!activeCategories.length && <div className="panel empty">카테고리를 먼저 추가해 주세요.</div>}
        {(archivedCategories.length > 0 || archivedTasks.length > 0) && <details className="panel archiveBox"><summary>보관함 ({archivedCategories.length + archivedTasks.length})</summary><div className="archiveList">{archivedCategories.map(category => <div key={category.id}><span>카테고리 · {category.title}</span><div className="libraryActions"><form action={restoreCategory}><input type="hidden" name="categoryId" value={category.id}/><button className="textButton accent">복원</button></form><ConfirmSubmit action={deleteCategory} fields={{ categoryId: category.id }} message={`‘${category.title}’ 카테고리를 영구 삭제할까요?`}><button className="textButton dangerText">삭제</button></ConfirmSubmit></div></div>)}{archivedTasks.map(task => <div key={task.id}><span>{task.category.title} · {task.title}</span><div className="libraryActions"><form action={restoreTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton accent">복원</button></form><ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={`‘${task.title}’을 영구 삭제할까요?`}><button className="textButton dangerText">삭제</button></ConfirmSubmit></div></div>)}</div></details>}
      </section>
      <aside className="panel todaySidebar"><div className="sectionTitle"><h2>{selectedLabel} 작업</h2><span>{view.items.length}</span></div><form action={addWorkdayItem} className="rowForm quickToday"><input type="hidden" name="workdayId" value={view.id}/><label className="sr-only" htmlFor="one-off-title">이 날짜 전용 작업</label><input id="one-off-title" name="title" placeholder="이 날짜에만 할 작업" required/><button className="button">추가</button></form>{view.items.map(item => <div className="todayItem todayManaged" key={item.id}><div><span>{item.title}</span><small>{item.categoryTitle ? `${item.categoryTitle} · ` : ""}{item.status === "completed" ? "완료" : "미완료"}</small></div>{item.sessionCount === 0 && <ConfirmSubmit action={removeWorkdayItem} fields={{ itemId: item.id }} message={`이 날짜에서 ‘${item.title}’을 뺄까요?`}><button className="textButton dangerText">빼기</button></ConfirmSubmit>}</div>)}{!view.items.length && <p className="empty">왼쪽 카테고리를 열고 작업을 선택하거나 위에서 이 날짜 전용 작업을 추가하세요.</p>}</aside>
    </div>
  </main>;
}
