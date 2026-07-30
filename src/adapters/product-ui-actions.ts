"use server";

import { cookies } from "next/headers";
import { signOut } from "@/lib/auth-actions";
import { submitAuth } from "@/lib/auth-actions";
import {
  createProject, updateProject, updateProjectArea,
  createSection, updateSection, deleteSection,
  updateWeeklyFocusGoal,
  createArea, updateArea,
  archiveTask, deleteTask, restoreTask,
  archiveArea, deleteArea, restoreArea,
  archiveProject, deleteProject, restoreProject,
} from "@/lib/actions";

export async function changeProductLocale(locale:"ko"|"en") {
  (await cookies()).set("workday-locale",locale,{path:"/",sameSite:"lax"});
}
export async function toggleProductLocale() {
  const store=await cookies();
  store.set("workday-locale",store.get("workday-locale")?.value==="en"?"ko":"en",{path:"/",sameSite:"lax"});
}

export async function signOutProduct() {
  await signOut();
}
export async function authenticateProduct(form:FormData){await submitAuth({},form);}

function idForm(key:string,id:string) {
  const form=new FormData(); form.set(key,id); return form;
}

export async function archiveProductTask(id:string){await archiveTask(idForm("taskId",id));}
export async function deleteProductTask(id:string){await deleteTask(idForm("taskId",id));}

export async function restoreProductItem(item:{id:string;kind:"project"|"area"|"task"}) {
  if(item.kind==="project")await restoreProject(idForm("projectId",item.id));
  else if(item.kind==="area")await restoreArea(idForm("areaId",item.id));
  else await restoreTask(idForm("taskId",item.id));
}
export async function deleteProductItem(item:{id:string;kind:"project"|"area"|"task"}) {
  if(item.kind==="project")await deleteProject(idForm("projectId",item.id));
  else if(item.kind==="area")await deleteArea(idForm("areaId",item.id));
  else await deleteTask(idForm("taskId",item.id));
}

export async function archiveProductArea(id:string){await archiveArea(idForm("areaId",id));}
export async function deleteProductArea(id:string){await deleteArea(idForm("areaId",id));}
export async function createProductArea(name:string,color:string){const form=new FormData();form.set("title",name);form.set("color",color);await createArea(form);}
export async function updateProductArea(id:string,name:string,color:string){const form=idForm("areaId",id);form.set("title",name);form.set("color",color);await updateArea(form);}
export async function archiveProductProject(id:string){await archiveProject(idForm("projectId",id));}
export async function deleteProductProject(id:string){await deleteProject(idForm("projectId",id));}
export async function createProductProject(name:string,color:string,areaId:string){const form=new FormData();form.set("title",name);form.set("color",color);form.set("areaId",areaId);await createProject(form);}
export async function updateProductProject(id:string,name:string,color:string,areaId:string){const form=idForm("projectId",id);form.set("title",name);form.set("color",color);await updateProject(form);const area=idForm("projectId",id);area.set("areaId",areaId);await updateProjectArea(area);}
export async function createProductSection(projectId:string,name:string){const form=idForm("projectId",projectId);form.set("title",name);await createSection(form);}
export async function updateProductSection(id:string,name:string){const form=idForm("sectionId",id);form.set("title",name);await updateSection(form);}
export async function deleteProductSection(id:string){await deleteSection(idForm("sectionId",id));}
export async function saveProductWeeklyGoal(weekStart:string,hours:number){const form=new FormData();form.set("weeklyFocusMinutes",String(Math.round(hours*60)));form.set("weekStart",weekStart);await updateWeeklyFocusGoal(form);}
