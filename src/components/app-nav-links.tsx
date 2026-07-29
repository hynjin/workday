"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkdayIcon, type WorkdayIconName } from "@/components/workday-icon";

export function AppNavLinks({ labels }: { labels: readonly string[] }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: labels[1], icon: "calendar" as WorkdayIconName },
    { href: "/tasks", label: labels[0], icon: "tasks" as WorkdayIconName },
    { href: "/areas", label: labels[2] === "Areas" ? "영역" : labels[2], icon: "areas" as WorkdayIconName },
    { href: "/projects", label: labels[3], icon: "projects" as WorkdayIconName },
    { href: "/growth", label: labels[4], icon: "reports" as WorkdayIconName },
    { href: "/archive", label: labels[5], icon: "archive" as WorkdayIconName },
  ];
  return <nav className="wd-nav" aria-label="Main navigation">
    {links.map(link => {
      const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
      return <Link href={link.href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined} key={link.href}><WorkdayIcon name={link.icon}/><span>{link.label}</span></Link>;
    })}
  </nav>;
}
