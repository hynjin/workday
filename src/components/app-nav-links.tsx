"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "calendar" | "tasks" | "areas" | "projects" | "reports";

function NavIcon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "calendar") return <svg {...common}><path d="M7 3v3M17 3v3M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="m9 15 2 2 4-5"/></svg>;
  if (name === "tasks") return <svg {...common}><path d="m5 7 1.5 1.5L9 5.5M12 7h7M5 13l1.5 1.5L9 11.5M12 13h7M5 19l1.5 1.5L9 17.5M12 19h7"/></svg>;
  if (name === "areas") return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/></svg>;
  if (name === "projects") return <svg {...common}><path d="M5 6.5h5l1.5 2H19v9H5z"/><path d="M5 6.5v11"/></svg>;
  return <svg {...common}><path d="M5 20V10M12 20V4M19 20v-7"/></svg>;
}

export function AppNavLinks({ labels }: { labels: readonly string[] }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: labels[1], icon: "calendar" as const },
    { href: "/tasks", label: labels[0], icon: "tasks" as const },
    { href: "/areas", label: labels[2] === "Areas" ? "영역" : labels[2], icon: "areas" as const },
    { href: "/projects", label: labels[3], icon: "projects" as const },
    { href: "/growth", label: labels[4], icon: "reports" as const },
  ];
  return <nav className="appNav" aria-label="Main navigation">
    {links.map(link => {
      const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
      return <Link href={link.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} key={link.href}><NavIcon name={link.icon}/><span>{link.label}</span></Link>;
    })}
  </nav>;
}
