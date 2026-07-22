import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "작업일", description: "오늘 할 일을 고르고 실제 집중 시간을 기록하는 개인 작업일 관리 앱" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
