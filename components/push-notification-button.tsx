"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function decodeKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

type PushSupport = "server" | "supported" | "unsupported";

const subscribeToPushSupport = () => () => {};

function getPushSupportSnapshot(): PushSupport {
  return "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
    ? "supported"
    : "unsupported";
}

function getPushSupportServerSnapshot(): PushSupport {
  return "server";
}

export function PushNotificationButton() {
  const support = useSyncExternalStore(
    subscribeToPushSupport,
    getPushSupportSnapshot,
    getPushSupportServerSnapshot,
  );
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (support !== "supported") return;

    void navigator.serviceWorker.getRegistration().then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      setEnabled(Boolean(subscription));
      if (Notification.permission === "denied") setMessage("Notifications système bloquées dans le navigateur.");
    });
  }, [support]);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Autorisation refusée. Activez les notifications dans les réglages du navigateur.");
        return;
      }

      const configResponse = await fetch("/api/notifications/push-subscriptions", { cache: "no-store" });
      if (!configResponse.ok) throw new Error("push-config-failed");
      const config = await configResponse.json() as { publicKey: string | null };
      if (!config.publicKey) {
        setMessage("Notifications système non configurées sur le serveur.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(config.publicKey),
      });
      const response = await fetch("/api/notifications/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("subscription-failed");
      setEnabled(true);
      setMessage("Notifications système activées sur cet appareil.");
    } catch {
      setMessage("Activation des notifications système impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/notifications/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("unsubscribe-failed");
        await subscription.unsubscribe();
      }
      setEnabled(false);
      setMessage("Notifications système désactivées sur cet appareil.");
    } catch {
      setMessage("Désactivation des notifications système impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (support === "unsupported") {
    return <p className="text-xs text-slate-500">Les notifications système ne sont pas prises en charge par ce navigateur.</p>;
  }
  if (support === "server") return null;

  return (
    <div className="push-notification-control">
      <button
        type="button"
        disabled={busy}
        onClick={() => void (enabled ? disable() : enable())}
        className={enabled ? "button-secondary" : "button-primary"}
      >
        {busy ? "Mise à jour…" : enabled ? "Push activé" : "Activer le push"}
      </button>
      {message ? <p className="push-notification-status" role="status">{message}</p> : null}
    </div>
  );
}
