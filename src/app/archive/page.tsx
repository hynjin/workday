import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n";
import { ApprovedArchivePresentation, type ArchivePreviewItem } from "@/presentation/archive/archive-view";
import { deleteProductItem, restoreProductItem, signOutProduct, toggleProductLocale } from "@/adapters/product-ui-actions";

export const dynamic="force-dynamic";

export default async function ArchivePage() {
  const [locale,areas,projects,tasks]=await Promise.all([
    getLocale(),
    prisma.area.findMany({where:{status:"archived"},orderBy:{archivedAt:"desc"}}),
    prisma.project.findMany({where:{status:"archived"},orderBy:{archivedAt:"desc"}}),
    prisma.task.findMany({where:{status:"archived",parentTaskId:null},orderBy:{archivedAt:"desc"}}),
  ]);
  const both=(title:string)=>({ko:title,en:title});
  const items:ArchivePreviewItem[]=[
    ...projects.map(item=>({id:item.id,kind:"project" as const,title:both(item.title),color:item.color})),
    ...areas.map(item=>({id:item.id,kind:"area" as const,title:both(item.title),color:item.color})),
    ...tasks.map(item=>({id:item.id,kind:"task" as const,title:both(item.title),color:"gray"})),
  ];
  return <ApprovedArchivePresentation locale={locale} initialItems={items} navigationBasePath=""
    onLocaleChange={toggleProductLocale} onSignOut={signOutProduct}
    onRestore={restoreProductItem} onDelete={deleteProductItem}/>;
}
