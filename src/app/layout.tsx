import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { generateOccurrences } from "@/lib/recurrence";
import { getWorkdayDate } from "@/lib/workday-date";
import { getOptionalUser } from "@/lib/auth";
import { LegacyProductTools } from "@/components/legacy-product-tools";
import "./globals.css";
import "./workday.css";
import "../../ui/styles.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "ko"
    ? { title: "Workday", description: "오늘 할 일을 고르고 실제 집중 시간을 기록하는 개인 생산성 앱" }
    : { title: "Workday", description: "A personal workday planner for choosing tasks and tracking focused time." };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const user = await getOptionalUser();
  let projects: { id: string; title: string; color: string }[] = [];
  let areas: { id: string; title: string; color: string }[] = [];
  if (user) {
    try {
      const today = getWorkdayDate();
      await generateOccurrences({ from: today, to: today });
      [projects, areas] = await Promise.all([
        prisma.project.findMany({ where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, title: true, color: true } }),
        prisma.area.findMany({ where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, title: true, color: true } }),
      ]);
    } catch {
      // UI previews and auth-only routes must remain available when the local DB is offline.
    }
  }
  return <html lang={locale}><body>{children}{user&&<LegacyProductTools locale={locale} projects={projects} areas={areas}/>}</body></html>;
}
