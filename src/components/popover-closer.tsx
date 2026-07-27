"use client";

import { useEffect } from "react";

export function PopoverCloser() {
  useEffect(() => {
    const close = (details: HTMLDetailsElement) => {
      details.open = false;
    };
    const onPointerDown = (event: PointerEvent) => {
      document.querySelectorAll<HTMLDetailsElement>("details.moreMenu[open]").forEach((details) => {
        if (!details.contains(event.target as Node)) close(details);
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const details = document.querySelector<HTMLDetailsElement>("details.moreMenu[open]");
      if (!details) return;
      close(details);
      details.querySelector<HTMLElement>("summary")?.focus();
    };
    const onToggle = (event: Event) => {
      const opened = event.target;
      if (!(opened instanceof HTMLDetailsElement) || !opened.matches(".moreMenu") || !opened.open) return;
      document.querySelectorAll<HTMLDetailsElement>("details.moreMenu[open]").forEach((details) => {
        if (details !== opened) close(details);
      });
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("details.moreMenu button, details.moreMenu a")) return;
      const details = target.closest<HTMLDetailsElement>("details.moreMenu");
      if (details) queueMicrotask(() => close(details));
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("toggle", onToggle, true);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("toggle", onToggle, true);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
