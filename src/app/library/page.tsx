import { AppNav } from "@/components/app-nav";
import { addWorkdayItem, archiveCategory, archiveTask, createCategory, createTask, restoreCategory, restoreTask, updateCategory, updateTask } from "@/lib/actions";
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
          <div className="categoryHeader"><form action={updateCategory} className="inlineEdit"><input type="hidden" name="categoryId" value={category.id}/><label className="sr-only" htmlFor={`category-${category.id}`}>카테고리 이름</label><input id={`category-${category.id}`} name="title" defaultValue={category.title}/><button className="textButton">이름 저장</button></form><form action={archiveCategory}><input type="hidden" name="categoryId" value={category.id}/><button className="textButton muted">카테고리 보관</button></form></div>
          <div className="taskRows">{category.tasks.map(task => <div className="libraryTask" key={task.id}><form action={updateTask} className="inlineEdit"><input type="hidden" name="taskId" value={task.id}/><label className="sr-only" htmlFor={`task-${task.id}`}>세부 작업 이름</label><input id={`task-${task.id}`} name="title" defaultValue={task.title}/><button className="textButton">저장</button></form><div className="libraryActions"><form action={addWorkdayItem}><input type="hidden" name="workdayId" value={view.id}/><input type="hidden" name="taskId" value={task.id}/><input type="hidden" name="title" value={task.title}/><button className="textButton accent">오늘 추가</button></form><form action={archiveTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton muted">보관</button></form></div></div>)}</div>
          <form action={createTask} className="rowForm detailCreate"><input type="hidden" name="categoryId" value={category.id}/><label className="sr-only" htmlFor={`new-task-${category.id}`}>세부 작업 추가</label><input id={`new-task-${category.id}`} name="title" placeholder={`${category.title}의 세부 작업 추가`} required/><button className="button secondary">세부 작업 추가</button></form>
        </article>)}
        {!activeCategories.length && <div className="panel empty">카테고리를 먼저 추가해 주세요.</div>}
        {(archivedCategories.length > 0 || archivedTasks.length > 0) && <details className="panel archiveBox"><summary>보관함 ({archivedCategories.length + archivedTasks.length})</summary><div className="archiveList">{archivedCategories.map(category => <div key={category.id}><span>카테고리 · {category.title}</span><form action={restoreCategory}><input type="hidden" name="categoryId" value={category.id}/><button className="textButton accent">복원</button></form></div>)}{archivedTasks.map(task => <div key={task.id}><span>{task.category.title} · {task.title}</span><form action={restoreTask}><input type="hidden" name="taskId" value={task.id}/><button className="textButton accent">복원</button></form></div>)}</div></details>}
      </section>
      <aside className="panel todaySidebar"><div className="sectionTitle"><h2>이번 작업일</h2><span>{view.items.length}</span></div>{view.items.map(item => <div className="todayItem" key={item.id}><span>{item.title}</span><small>{item.status === "completed" ? "완료" : "미완료"}</small></div>)}{!view.items.length && <p className="empty">왼쪽 세부 작업에서 ‘오늘 추가’를 눌러 주세요.</p>}</aside>
    </div>
  </main>;
}
