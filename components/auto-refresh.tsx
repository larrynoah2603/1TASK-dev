"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const MIN_REFRESH_GAP_MS = 4_000;
const POST_REFRESH_COOLDOWN_MS = 1_500;

export function AutoRefresh({ intervalMs = 15_000, enabled = true }: { intervalMs?: number; enabled?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let timer: number | undefined;
    let focusTimer: number | undefined;
    let refreshing = false;
    let lastRefreshAt = 0;

    const refresh = () => {
      if (cancelled || document.visibilityState !== "visible" || refreshing) return;
      const now = Date.now();
      if (now - lastRefreshAt < MIN_REFRESH_GAP_MS) return;
      lastRefreshAt = now;
      refreshing = true;
      router.refresh();
      window.setTimeout(() => {
        refreshing = false;
      }, POST_REFRESH_COOLDOWN_MS);
    };

    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => {
        refresh();
        schedule();
      }, Math.max(intervalMs, MIN_REFRESH_GAP_MS));
    };

    const refreshOnReturn = () => {
      if (document.visibilityState !== "visible") return;
      if (focusTimer) window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(refresh, 700);
    };

    schedule();
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("focus", refreshOnReturn);
    window.addEventListener("online", refreshOnReturn);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (focusTimer) window.clearTimeout(focusTimer);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("focus", refreshOnReturn);
      window.removeEventListener("online", refreshOnReturn);
    };
  }, [enabled, intervalMs, router]);

  return null;
}
