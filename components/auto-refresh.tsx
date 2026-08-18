"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const timer = window.setInterval(refreshIfVisible, intervalMs);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, [intervalMs, router]);

  return null;
}
