"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchWithTimeout } from "@/lib/client-http";

type NotificationStateValue = {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  refreshUnreadCount: () => Promise<void>;
};

const NotificationStateContext = createContext<NotificationStateValue | null>(null);

export function NotificationStateProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const inFlight = useRef(false);

  const refreshUnreadCount = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await fetchWithTimeout("/api/notifications/unread-count", { cache: "no-store" }, 8_000);
      if (!response.ok) return;
      const data = await response.json() as { unreadCount?: number };
      setUnreadCount(Number.isFinite(data.unreadCount) ? Number(data.unreadCount) : 0);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshUnreadCount(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshUnreadCount]);

  return (
    <NotificationStateContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      {children}
    </NotificationStateContext.Provider>
  );
}

export function useNotificationState() {
  const value = useContext(NotificationStateContext);
  if (!value) throw new Error("useNotificationState must be used within NotificationStateProvider");
  return value;
}

export function NotificationBadge({ compact = false }: { compact?: boolean }) {
  const { unreadCount } = useNotificationState();
  if (!unreadCount) return null;
  return <span className={compact ? "nav-notification-count" : "notification-count"}>{unreadCount > 9 ? "9+" : unreadCount}</span>;
}
