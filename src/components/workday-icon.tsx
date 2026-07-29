export type WorkdayIconName =
  | "archive" | "areas" | "calendar" | "chevronDown" | "chevronLeft"
  | "chevronRight" | "close" | "cloud" | "focus" | "language"
  | "logout" | "more" | "plus" | "projects" | "reports" | "search"
  | "tasks";

export function WorkdayIcon({ name, size = 18 }: { name: WorkdayIconName; size?: number }) {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const, "aria-hidden": true,
  };
  switch (name) {
    case "calendar": return <svg {...props}><path d="M7 3v3M17 3v3M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="m9 15 2 2 4-5"/></svg>;
    case "tasks": return <svg {...props}><path d="m5 7 1.5 1.5L9 5.5M12 7h7M5 13l1.5 1.5L9 11.5M12 13h7M5 19l1.5 1.5L9 17.5M12 19h7"/></svg>;
    case "areas": return <svg {...props}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/></svg>;
    case "projects": return <svg {...props}><path d="M5 6.5h5l1.5 2H19v9H5z"/><path d="M5 6.5v11"/></svg>;
    case "reports": return <svg {...props}><path d="M5 20V10M12 20V4M19 20v-7"/></svg>;
    case "archive": return <svg {...props}><path d="M4 7h16v13H4zM3 4h18v3H3zM9 11h6"/></svg>;
    case "search": return <svg {...props}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
    case "language": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3C9.7 5.5 8.5 8.5 8.5 12S9.7 18.5 12 21"/></svg>;
    case "logout": return <svg {...props}><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></svg>;
    case "plus": return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "more": return <svg {...props}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></svg>;
    case "chevronDown": return <svg {...props}><path d="m7 10 5 5 5-5"/></svg>;
    case "chevronLeft": return <svg {...props}><path d="m14 7-5 5 5 5"/></svg>;
    case "chevronRight": return <svg {...props}><path d="m10 7 5 5-5 5"/></svg>;
    case "close": return <svg {...props}><path d="m7 7 10 10M17 7 7 17"/></svg>;
    case "focus": return <svg {...props}><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/><circle cx="12" cy="12" r="3"/></svg>;
    default: return <svg {...props}><path d="M6.5 15.5a5 5 0 0 1 .9-9.9A6.7 6.7 0 0 1 20 8.7a4 4 0 0 1-1 7.8H6.5Z"/><path d="M9 19h6"/></svg>;
  }
}
