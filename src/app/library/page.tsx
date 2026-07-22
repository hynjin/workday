import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit, EditableText } from "@/components/editable-text";
import { addWorkdayItem, archiveCategory, archiveTask, createCategory, createTask, deleteCategory, deleteTask, removeWorkdayItem, restoreCategory, restoreTask, updateCategory, updateTask } from "@/lib/actions";
import { getOrCreateCurrentWorkday, getWorkdayView } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const workday = await getOrCreateCurrentWorkday();
  const [view, activeCategories, archivedCategories, archivedTasks] = await Promise.all([
    getWorkdayView(workday.id),
    prisma.taskCategory.findMany({ where: { status: "active" }, orderBy: { createdAt: "asc" }, include: { tasks: { where: { status: "active" }, orderBy: { createdAt: "asc" } } } }),
    prisma.taskCategory.findMany({ where: { status: "archived" }, orderBy: { archivedAt: "desc" } }),
    prisma.task.findMany({ where: { status: "archived", category: { status: "active" } }, orderBy: { archivedAt: "desc" }, include: { category: true } }),
  ]);
  return <main className="shell">
    <AppNav />
    <header className="pageHeader"><div><p className="eyebrow">언제든 수정 가능</p><h1>전체 목록 · 작업 준비</h1><p className="lede">큰 카테고리 아래에 반복해서 사용할 세부 작업을 정리하고, 오늘 할 항목만 골라 추가하세요.</p></div><span className="status">오늘 {view.items.length}개</span></header>
    <div className="libraryGrid">
      <section className="libraryMain">
        <form action={createCategory} className="rowForm categoryCreate"><label className="sr-only" htmlFor="category-title">새 카테고리</label><input id="category-title" name="title" placeholder="새 카테고리 (예: 영어, 프로젝트)" required maxLength={120}/><button className="button">카테고리 추가</button></form>
        {activeCategories.map(category => <article className="panel categoryCard" key={category.id}>
          <div className="categoryHeader"><EditableText action={updateCategory} idName="categoryId" id={category.id} value={category.title} label="카테고리 이름" className="categoryName"/><div className="libraryActions"><form action={archiveCategory}><input type="hidden" name="categoryId" value={category.id}/><button className="textButton muted">보관</button></form><ConfirmSubmit action={deleteCategory} fields={{ categoryId: category.id }} message={`‘${category.title}’ 카테고리와 그 안의 세부 작업을 삭제할까요? 작업일 기록은 유지됩니다.`}><button className="textButton dangerText">삭제</button></ConfirmSubmit></div></div>
          <form action={createTask} className="rowForm detailCreate"><input type="hidden" name="categoryId" value={category.id}/><label className="sr-only" htmlFor={`new-task-${category.id}`}>세부 작업 추가</label><input id={`new-task-${category.id}`} name="title" placeholder={`${category.title}의 세부 작업 추가`} required/><button className="button secondary">세부 작업 추가</button></form>
          <div className="taskRows">{category.tasks.map(task => <div className="libraryTask" key={task.id}><EditableText action={updateTask} idName="taskId" id={task.id} value={task.title} label="세부 작업 이름"/><div className="libraryActions"><form action={addWorkdayItem}><input type="hidden" name="workdayId" value={view.id}/><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="title" value={task.title}/><button className="textButton accent">오늘 추가</button></form><form action={archiveTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton muted">보관</button></form><ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={`‘${task.title}’을 전체 목록에서 삭제할까요? 기존 작업일 기록은 유지됩니다.`}><button className="textButton dangerText">삭제</button></ConfirmSubmit></div></div>)}</div>
        </article>)}
        {!activeCategories.length && <div className="panel empty">카테고리를 먼저 추가해 주세요.</div>}
        {(archivedCategories.length > 0 || archivedTasks.length > 0) && <details className="panel archiveBox"><summary>보관함 ({archivedCategories.length + archivedTasks.length})</summary><div className="archiveList">{archivedCategories.map(category => <div key={category.id}><span>카테고리 · {category.title}</span><div className="libraryActions"><form action={restoreCategory}><input type="hidden" name="categoryId" value={category.id}/><button className="textButton accent">복원</button></form><ConfirmSubmit action={deleteCategory} fields={{ categoryId: category.id }} message={`‘${category.title}’ 카테고리를 영구 삭제할까요?`}><button className="textButton dangerText">삭제</button></ConfirmSubmit></div></div>)}{archivedTasks.map(task => <div key={task.id}><span>{task.category.title} · {task.title}</span><div className="libraryActions"><form action={restoreTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton accent">복원</button></form><ConfirmSubmit action={deleteTask} fields={{ taskId: task.id }} message={`‘${task.title}’을 영구 삭제할까요?`}><button className="textButton dangerText">삭제</button></ConfirmSubmit></div></div>)}</div></details>}
      </section>
      <aside className="panel todaySidebar"><div className="sectionTitle"><h2>이번 작업일</h2><span>{view.items.length}</span></div><form action={addWorkdayItem} className="rowForm quickToday"><input type="hidden" name="workdayId" value={view.id}/><label className="sr-only" htmlFor="one-off-title">이번 작업일 전용 작업</label><input id="one-off-title" name="title" placeholder="이번 작업일에만 추가" required/><button className="button">추가</button></form>{view.items.map(item => <div className="todayItem todayManaged" key={item.id}><div><span>{item.title}</span><small>{item.status === "completed" ? "완료" : "미완료"}</small></div>{item.sessionCount === 0 && <ConfirmSubmit action={removeWorkdayItem} fields={{ itemId: item.id }} message={`이번 작업일에서 ‘${item.title}’을 뺄까요?`}><button className="textButton dangerText">빼기</button></ConfirmSubmit>}</div>)}{!view.items.length && <p className="empty">왼쪽 세부 작업에서 ‘오늘 추가’를 누르거나 위에서 이번 작업일 전용 작업을 추가하세요.</p>}</aside>
    </div>
  </main>;
}
