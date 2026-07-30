import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { ApprovedProjectsPresentation, type ProjectPreviewProject, type ProjectPreviewSection, type ProjectPreviewTask } from "@/presentation/projects/projects-view";
import { createScheduleTask, updateScheduleTask } from "@/adapters/schedule-actions";
import { archiveProductProject, archiveProductTask, createProductProject, createProductSection, deleteProductProject, deleteProductSection, deleteProductTask, signOutProduct, toggleProductLocale, updateProductProject, updateProductSection } from "@/adapters/product-ui-actions";
import { moveProjectSection, moveProjectTask } from "@/lib/actions";

export const dynamic="force-dynamic";

export default async function ProjectsPage({searchParams}:{searchParams:Promise<{project?:string}>}) {
  const [params,locale]=await Promise.all([searchParams,getLocale()]);
  const projects=await prisma.project.findMany({where:{status:"active"},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}],include:{area:true,tasks:{where:{status:"active",parentTaskId:null},include:{recurrenceRule:true,items:{include:{workday:true}}}}}});
  const selected=projects.find(project=>project.id===params.project)??projects[0];
  const sections=selected?await prisma.section.findMany({where:{projectId:selected.id},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]}):[];
  const areas=await prisma.area.findMany({where:{status:"active"},orderBy:{title:"asc"},select:{id:true,title:true,color:true}});
  const both=(value:string)=>({ko:value,en:value});
  const projectItems:ProjectPreviewProject[]=projects.map(project=>({id:project.id,title:both(project.title),color:project.color,count:project.tasks.length,area:project.area?{id:project.area.id,title:both(project.area.title),color:project.area.color}:undefined}));
  const mapTask=(task:NonNullable<typeof selected>["tasks"][number]):ProjectPreviewTask=>{const dates=task.items.filter(item=>item.status==="planned").map(item=>item.workday.workdayDate.toISOString().slice(0,10));const label=dates[0]??(locale==="ko"?"일정 없음":"No date");return{id:task.id,title:both(task.title),goalMinutes:task.estimatedMinutes,priority:task.priority,repeat:task.recurrenceRule?.frequency??"none",scheduledDates:dates,schedule:{ko:label,en:label},completed:task.items.length>0&&task.items.every(item=>item.status==="completed")};};
  const defaultTasks=(selected?.tasks??[]).filter(task=>!task.sectionId).map(mapTask);
  const sectionItems:ProjectPreviewSection[]=[{id:"default",title:{ko:"기본 목록",en:"Default list"},tasks:defaultTasks},...sections.map(section=>({id:section.id,title:both(section.title),tasks:(selected?.tasks??[]).filter(task=>task.sectionId===section.id).map(mapTask)}))];
  return <ApprovedProjectsPresentation locale={locale} projects={projectItems} initialSections={sectionItems} areas={areas.map(area=>({...area,kind:"area" as const}))} navigationBasePath=""
    onLocaleChange={toggleProductLocale} onSignOut={signOutProduct}
    onCreateTask={createScheduleTask} onUpdateTask={updateScheduleTask} onArchiveTask={archiveProductTask} onDeleteTask={deleteProductTask}
    onCreateProject={createProductProject} onUpdateProject={updateProductProject} onArchiveProject={archiveProductProject} onDeleteProject={deleteProductProject}
    onCreateSection={createProductSection} onUpdateSection={updateProductSection} onDeleteSection={deleteProductSection}
    onMoveTask={moveProjectTask} onMoveSection={moveProjectSection}/>;
}
