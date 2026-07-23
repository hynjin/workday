import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function Summary({ searchParams }: { searchParams: Promise<{ workdayId?: string }> }) {
  const { workdayId } = await searchParams;
  if (!workdayId) redirect("/");
  const workday = await prisma.workday.findUnique({ where: { id: workdayId }, select: { workdayDate: true } });
  redirect(workday ? `/?date=${workday.workdayDate.toISOString().slice(0, 10)}` : "/");
}
