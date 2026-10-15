"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function decodeKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}


function serializeSubscription(subscription: PushSubscription) {
  const serialized = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: serialized.keys?.p256dh,
      auth: serialized.keys?.auth,
    },
  };
}

async function syncSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/notifications/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serializeSubscription(subscription)),
  });
  if (!response.ok) throw new Error("subscription-sync-failed");
}

type PushServerConfig = { publicKey: string | null; configured: boolean };

async function getPushServerConfig(): Promise<PushServerConfig> {
  const response = await fetch("/api/notifications/push-subscriptions", { cache: "no-store" });
  if (!response.ok) throw new Error("push-config-failed");
  return await response.json() as PushServerConfig;
}

// A rotated VAPID key invalidates subscriptions created under the old key.
// Compare only public key bytes; do not read or expose device auth secrets.
function usesCurrentPushKey(subscription: PushSubscription, publicKey: string) {
  const previous = subscription.options.applicationServerKey;
  if (!previous) return true; // Older browsers may not expose the key.
  const expected = decodeKey(publicKey);
  const actual = new Uint8Array(previous);
  return actual.length === expected.length && actual.every((byte, index) => byte === expected[index]);
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

    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (Notification.permission === "denied") {
        setEnabled(false);
        setMessage("Notifications système bloquées dans le navigateur.");
        return;
      }

      if (!subscription) {
        setEnabled(false);
        return;
      }

      try {
        const config = await getPushServerConfig();
        if (!config.configured || !config.publicKey) {
          setEnabled(false);
          setMessage("Push non opérationnel : configuration serveur incomplète. Contactez l’administrateur.");
          return;
        }
        if (!usesCurrentPushKey(subscription, config.publicKey)) {
          setEnabled(false);
          setMessage("L’abonnement utilise une ancienne clé de notification. Cliquez sur Activer le push pour le renouveler.");
          return;
        }
        await syncSubscription(subscription);
        setEnabled(true);
        setMessage("Abonnement enregistré dans 1TASK. La livraison dépend aussi du serveur et des autorisations système.");
      } catch {
        setEnabled(false);
        setMessage("Abonnement détecté dans le navigateur, mais non synchronisé avec 1TASK. Cliquez sur Activer le push pour réessayer.");
      }
    })();
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

      const config = await getPushServerConfig();
      if (!config.configured || !config.publicKey) {
        setEnabled(false);
        setMessage("Notifications système non configurées sur le serveur.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const existing = await registration.pushManager.getSubscription();
      const stale = Boolean(existing && !usesCurrentPushKey(existing, config.publicKey));
      if (stale) await existing!.unsubscribe();
      const subscription = existing && !stale ? existing : await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(config.publicKey),
      });
      await syncSubscription(subscription);
      if (stale && existing && existing.endpoint !== subscription.endpoint) {
        // The new subscription is persisted before retiring the old endpoint.
        // An unreachable server cleanup does not invalidate the new device.
        void fetch("/api/notifications/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        }).catch(() => {});
      }
      setEnabled(true);
      setMessage("Abonnement enregistré dans 1TASK. Vérifiez aussi les notifications autorisées dans Windows et le navigateur.");
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
