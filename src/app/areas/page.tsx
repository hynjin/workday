import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { dateKeyToDate, getWorkdayDate } from "@/lib/workday-date";
import { ApprovedAreasPresentation, type AreaPreviewArea, type AreaPreviewProject, type AreaPreviewTask } from "@/presentation/areas/areas-view";
import { createScheduleTask, updateScheduleTask } from "@/adapters/schedule-actions";
import { archiveProductArea, archiveProductTask, createProductArea, deleteProductArea, deleteProductTask, signOutProduct, toggleProductLocale, updateProductArea } from "@/adapters/product-ui-actions";

export const dynamic="force-dynamic";

export default async function AreasPage({searchParams}:{searchParams:Promise<{area?:string}>}) {
  const [params,locale]=await Promise.all([searchParams,getLocale()]);
  const today=dateKeyToDate(getWorkdayDate());
  const areas=await prisma.area.findMany({where:{status:"active"},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],include:{_count:{select:{tasks:true,projects:true}}}});
  const selected=areas.find(area=>area.id===params.area)??areas[0];
  const detail=selected?await prisma.area.findUniqueOrThrow({where:{id:selected.id},include:{
    projects:{where:{status:"active"},include:{tasks:{where:{status:"active"},select:{id:true}}}},
    tasks:{where:{status:"active",projectId:null,parentTaskId:null},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],include:{recurrenceRule:true,items:{include:{workday:true},where:{status:"planned",workday:{workdayDate:{gte:today}}}}}},
  }}):null;
  const both=(value:string)=>({ko:value,en:value});
  const areaItems:AreaPreviewArea[]=areas.map(area=>({id:area.id,title:both(area.title),color:area.color,count:area._count.tasks+area._count.projects}));
  const projects:AreaPreviewProject[]=(detail?.projects??[]).map(project=>({id:project.id,title:both(project.title),color:project.color,completed:0,total:project.tasks.length}));
  const tasks:AreaPreviewTask[]=(detail?.tasks??[]).map(task=>{const dates=task.items.map(item=>item.workday.workdayDate.toISOString().slice(0,10));const label=dates[0]??(locale==="ko"?"일정 없음":"No date");return{id:task.id,title:both(task.title),goalMinutes:task.estimatedMinutes,priority:task.priority,repeat:task.recurrenceRule?.frequency??"none",scheduledDates:dates,schedule:{ko:label,en:label}};});
  return <ApprovedAreasPresentation locale={locale} areas={areaItems} projects={projects} tasks={tasks} navigationBasePath=""
    onLocaleChange={toggleProductLocale} onSignOut={signOutProduct}
    onCreateArea={createProductArea} onUpdateArea={updateProductArea} onArchiveArea={archiveProductArea} onDeleteArea={deleteProductArea}
    onCreateTask={createScheduleTask} onUpdateTask={updateScheduleTask} onArchiveTask={archiveProductTask} onDeleteTask={deleteProductTask}/>;
}
