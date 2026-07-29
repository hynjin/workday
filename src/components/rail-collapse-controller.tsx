"use client";

import { useEffect } from "react";

export function RailCollapseController() {
  useEffect(() => {
    const toggle = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".railCollapse");
      if (!button) return;
      const workspace = button.closest(".projectsWorkspace");
      const collapsed = !workspace?.classList.contains("railCollapsed");
      workspace?.classList.toggle("railCollapsed", collapsed);
      button.textContent = collapsed ? "›" : "‹";
      button.setAttribute("aria-expanded", String(!collapsed));
    };
    document.addEventListener("click", toggle);
    return () => document.removeEventListener("click", toggle);
  }, []);
  return null;
}
