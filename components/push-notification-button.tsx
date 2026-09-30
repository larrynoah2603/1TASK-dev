"use client";
import { useState } from "react";

function decodeKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function PushNotificationButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  async function enable() {
    setBusy(true); setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setMessage("Permission refusée."); return; }
      const config = await fetch("/api/notifications/push-subscriptions", { cache: "no-store" }).then((response) => response.json()) as { publicKey: string | null };
      if (!config.publicKey) { setMessage("Push non configuré."); return; }
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(config.publicKey) });
      const response = await fetch("/api/notifications/push-subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) throw new Error("subscription-failed");
      setMessage("Notifications push activées.");
    } catch { setMessage("Activation push impossible."); }
    finally { setBusy(false); }
  }
  return <div><button type="button" disabled={busy} onClick={() => void enable()} className="button-secondary">{busy ? "Activation…" : "Activer les notifications push"}</button>{message ? <p className="mt-1 text-xs text-slate-500">{message}</p> : null}</div>;
}
