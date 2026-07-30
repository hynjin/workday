import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { dateKeyToDate, getWorkdayDate } from "@/lib/workday-date";
import { ApprovedTasksPresentation, type TaskPreviewItem } from "@/presentation/tasks/tasks-view";
import { createScheduleTask, updateScheduleTask } from "@/adapters/schedule-actions";
import { archiveProductTask, deleteProductTask, signOutProduct, toggleProductLocale } from "@/adapters/product-ui-actions";

export const dynamic="force-dynamic";
type Filter="inbox"|"today"|"upcoming"|"unscheduled"|"completed";
const filters:Filter[]=["inbox","today","upcoming","unscheduled","completed"];

export default async function TasksPage({searchParams}:{searchParams:Promise<{filter?:string}>}) {
  const [params,locale]=await Promise.all([searchParams,getLocale()]);
  const filter=filters.includes(params.filter as Filter)?params.filter as Filter:"inbox";
  const todayKey=getWorkdayDate(),today=dateKeyToDate(todayKey),tomorrow=new Date(today);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
  let where:Prisma.TaskWhereInput;
  if(filter==="inbox")where={status:"active",projectId:null,areaId:null};
  else if(filter==="today")where={status:"active",items:{some:{workday:{workdayDate:today}}}};
  else if(filter==="upcoming")where={status:"active",items:{some:{status:"planned",workday:{workdayDate:{gte:tomorrow}}}}};
  else if(filter==="unscheduled")where={status:"active",items:{none:{status:"planned",workday:{workdayDate:{gte:today}}}}};
  else where={items:{some:{status:"completed"}}};
  const [tasks,projects,areas]=await Promise.all([
    prisma.task.findMany({where,orderBy:[{sortOrder:"asc"},{createdAt:"desc"}],include:{project:true,area:true,recurrenceRule:true,items:{include:{workday:true,focusSessions:true},orderBy:{workday:{workdayDate:"desc"}}}}}),
    prisma.project.findMany({where:{status:"active"},orderBy:{title:"asc"},select:{id:true,title:true,color:true}}),
    prisma.area.findMany({where:{status:"active"},orderBy:{title:"asc"},select:{id:true,title:true,color:true}}),
  ]);
  const items:TaskPreviewItem[]=tasks.map(task=>{
    const scheduled=task.items.find(item=>item.status==="planned"&&item.workday.workdayDate>=today);
    const dates=task.items.filter(item=>item.status==="planned").map(item=>item.workday.workdayDate.toISOString().slice(0,10));
    const location=task.project?.title??task.area?.title??(locale==="ko"?"수집함":"Inbox");
    const minutes=task.estimatedMinutes;
    const schedule=scheduled?new Intl.DateTimeFormat(locale==="ko"?"ko-KR":"en-CA",{timeZone:"UTC",month:"short",day:"numeric"}).format(scheduled.workday.workdayDate):(locale==="ko"?"일정 없음":"No date");
    return {id:task.id,title:{ko:task.title,en:task.title},category:{ko:location,en:location},color:task.project?.color??task.area?.color??"gray",goal:{ko:minutes?`${minutes}분`:"",en:minutes?`${minutes}m`:""},goalMinutes:minutes,focusedSeconds:task.items.flatMap(item=>item.focusSessions).reduce((sum,session)=>sum+(session.durationSeconds??0),0),priority:task.priority,repeatValue:task.recurrenceRule?.frequency??"none",schedule:{ko:schedule,en:schedule},scheduledDates:dates};
  });
  const options=[...areas.map(area=>({...area,kind:"area" as const})),...projects.map(project=>({...project,kind:"project" as const}))];
  return <ApprovedTasksPresentation locale={locale} items={items} options={options} initialTab={filter}
    navigationBasePath="" onLocaleChange={toggleProductLocale}
    onCreateTask={createScheduleTask} onUpdateTask={updateScheduleTask}
    onArchiveTask={archiveProductTask} onDeleteTask={deleteProductTask} onSignOut={signOutProduct}/>;
}
