"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchWithTimeout } from "@/lib/client-http";

type NotificationState = {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  refreshUnreadCount: () => Promise<void>;
};

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetchWithTimeout("/api/notifications/unread-count", { cache: "no-store" }, 8_000);
      if (!response.ok) return;
      const data = await response.json() as { unreadCount?: number };
      if (Number.isFinite(data.unreadCount)) setUnreadCount(Number(data.unreadCount));
    } catch {
      // Badge loading is non-critical and must never block the application shell.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void refreshUnreadCount();
    }, 250);
    const poll = window.setInterval(() => {
      void refreshUnreadCount();
    }, 20_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshUnreadCount();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(poll);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshUnreadCount]);

  const value = useMemo(() => ({ unreadCount, setUnreadCount, refreshUnreadCount }), [unreadCount, refreshUnreadCount]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationState() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotificationState must be used inside NotificationProvider");
  return value;
}

export function NotificationBadge({ className = "nav-notification-count" }: { className?: string }) {
  const { unreadCount } = useNotificationState();
  if (unreadCount <= 0) return null;
  return <span className={className}>{unreadCount > 9 ? "9+" : unreadCount}</span>;
}
