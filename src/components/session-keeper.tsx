"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SessionKeeper() {
  const router = useRouter();
  useEffect(() => {
    let lastRefresh = 0;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh < 5 * 60_000) return;
      lastRefresh = Date.now();
      const response = await fetch("/auth/refresh", { method: "POST", cache: "no-store" }).catch(() => null);
      if (response?.ok) router.refresh();
    };
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    const interval = window.setInterval(refresh, 20 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
      window.clearInterval(interval);
    };
  }, [router]);
  return null;
}
