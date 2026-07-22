import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FocusTimer from "./timer";

export const dynamic = "force-dynamic";
export default async function FocusPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await prisma.focusSession.findUnique({ where: { id: sessionId }, include: { workdayItem: { include: { focusSessions: true } } } });
  if (!session) notFound();
  if (session.endedAt) redirect("/");
  const previousSeconds = session.workdayItem.focusSessions.filter(s => s.id !== session.id).reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  return <FocusTimer sessionId={session.id} title={session.workdayItem.title} startedAt={session.startedAt.toISOString()} previousSeconds={previousSeconds}/>;
}
