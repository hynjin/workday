import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "ko"
    ? { title: "작업일", description: "오늘 할 일을 고르고 실제 집중 시간을 기록하는 개인 작업일 관리 앱" }
    : { title: "Workday", description: "A personal workday planner for choosing tasks and tracking focused time." };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return <html lang={locale}><body>{children}</body></html>;
}
