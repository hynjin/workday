import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { dateKeyToDate, getWorkdayDate } from "@/lib/workday-date";
import { ApprovedReportsPresentation, type ReportDay } from "@/presentation/reports/reports-view";
import { saveProductWeeklyGoal, signOutProduct, toggleProductLocale } from "@/adapters/product-ui-actions";

export const dynamic="force-dynamic";

export default async function ReportsPage() {
  const locale=await getLocale(),today=dateKeyToDate(getWorkdayDate()),weekStart=new Date(today);
  weekStart.setUTCDate(weekStart.getUTCDate()-((weekStart.getUTCDay()+6)%7));
  const weekEnd=new Date(weekStart);weekEnd.setUTCDate(weekEnd.getUTCDate()+7);
  const [goal,workdays]=await Promise.all([
    prisma.weeklyFocusGoal.findFirst({where:{weekStart}}),
    prisma.workday.findMany({where:{workdayDate:{gte:weekStart,lt:weekEnd}},include:{items:{where:{dismissedAt:null},include:{focusSessions:{where:{endedAt:{not:null}}}}}}}),
  ]);
  const labelsKo=["월","화","수","목","금","토","일"],labelsEn=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const reportDays:ReportDay[]=Array.from({length:7},(_,index)=>{
    const date=new Date(weekStart);date.setUTCDate(date.getUTCDate()+index);
    const workday=workdays.find(day=>day.workdayDate.getTime()===date.getTime());
    const items=workday?.items??[],minutes=Math.round(items.flatMap(item=>item.focusSessions).reduce((sum,session)=>sum+(session.durationSeconds??0),0)/60);
    const planned=items.length,goalMinutes=items.reduce((sum,item)=>sum+(item.dailyGoalMinutes??0),0)||null;
    return {label:{ko:labelsKo[index],en:labelsEn[index]},minutes,goalMinutes,planned,done:items.filter(item=>item.status==="completed").length,areaSegments:minutes?[minutes]:[],projectSegments:minutes?[minutes]:[]};
  });
  const actualMinutes=reportDays.reduce((sum,day)=>sum+day.minutes,0),plannedMinutes=reportDays.reduce((sum,day)=>sum+(day.goalMinutes??0),0);
  const completed=workdays.flatMap(day=>day.items).filter(item=>item.status==="completed").length;
  const sessions=workdays.flatMap(day=>day.items).flatMap(item=>item.focusSessions).length;
  const activeDays=reportDays.filter(day=>day.minutes>0).length;
  const data={goalHours:(goal?.weeklyFocusMinutes??600)/60,actualMinutes,plannedMinutes,completed,sessions,activeDays,streak:activeDays,days:reportDays};
  const saveGoal=saveProductWeeklyGoal.bind(null,weekStart.toISOString().slice(0,10));
  return <ApprovedReportsPresentation locale={locale} data={data} navigationBasePath="" onLocaleChange={toggleProductLocale} onSignOut={signOutProduct} onSaveGoal={saveGoal}/>;
}
