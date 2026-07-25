import { AppNav } from "@/components/app-nav";
import { ConfirmSubmit } from "@/components/editable-text";
import { copyWorkdayItem, moveWorkdayItem, removeWorkdayItem } from "@/lib/actions";
import { getWorkdayView } from "@/lib/data";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate, formatWorkdayDate, getWorkdayDate } from "@/lib/workday-date";

export const dynamic = "force-dynamic";

export default async function UpcomingPage() {
  const locale = await getLocale(), today = getWorkdayDate();
  const workdays = await prisma.workday.findMany({ where: { workdayDate: { gt: dateKeyToDate(today) }, status: { not: "completed" }, items: { some: {} } }, orderBy: { workdayDate: "asc" } });
  const views = await Promise.all(workdays.map(day => getWorkdayView(day.id)));
  return <main className="shell"><AppNav/>
    <header className="pageHeader"><div><p className="eyebrow">{locale === "ko" ? "미래 계획" : "FUTURE PLAN"}</p><h1>{locale === "ko" ? "예정" : "Upcoming"}</h1><p className="lede">{locale === "ko" ? "앞으로 계획한 작업을 날짜별로 보고, 다른 날짜로 이동하거나 복사할 수 있습니다." : "Review future work by date, then move or copy items as plans change."}</p></div><span className="status">{views.reduce((sum, day) => sum + day.items.length, 0)}{locale === "ko" ? "개" : ""}</span></header>
    <div className="upcomingList">{views.map(view => <section className="panel upcomingDay" key={view.id}><div className="sectionTitle"><h2>{formatWorkdayDate(view.workdayDate, locale)}</h2><span>{view.items.length}</span></div>{view.items.map(item => <article className="upcomingItem" key={item.id}><div><strong>{item.title}</strong><small>{item.projectTitle ?? (item.taskId ? (locale === "ko" ? "받은편지함" : "Inbox") : (locale === "ko" ? "하루 작업" : "One-off"))}</small></div><div className="scheduleActions"><form action={moveWorkdayItem}><input type="hidden" name="itemId" value={item.id}/><input type="date" name="date" min={today} defaultValue={today}/><button className="textButton accent">{locale === "ko" ? "이동" : "Move"}</button></form><form action={copyWorkdayItem}><input type="hidden" name="itemId" value={item.id}/><input type="date" name="date" min={today} defaultValue={today}/><button className="textButton">{locale === "ko" ? "복사" : "Copy"}</button></form><ConfirmSubmit action={removeWorkdayItem} fields={{ itemId: item.id }} message={locale === "ko" ? `‘${item.title}’ 계획을 삭제할까요?` : `Remove “${item.title}” from this date?`}><button className="textButton dangerText">{locale === "ko" ? "삭제" : "Delete"}</button></ConfirmSubmit></div></article>)}</section>)}</div>
    {!views.length && <section className="panel emptyState"><p>{locale === "ko" ? "예정된 작업이 없습니다. 빠른 추가에서 내일이나 날짜를 선택해 계획하세요." : "Nothing scheduled yet. Choose Tomorrow or a date in Quick add."}</p></section>}
  </main>;
}
