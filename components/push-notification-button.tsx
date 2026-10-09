"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function decodeKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function sameApplicationServerKey(subscription: PushSubscription, publicKey: string) {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const expected = decodeKey(publicKey);
  const actual = new Uint8Array(current);
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
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

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json() as { error?: string; message?: string };
    return data.error ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}

async function loadPushConfig() {
  const response = await fetch("/api/notifications/push-subscriptions", { cache: "no-store" });
  if (!response.ok) throw new Error(await readErrorMessage(response, "Configuration Push inaccessible."));
  const data = await response.json() as { publicKey: string | null };
  if (!data.publicKey) throw new Error("Notifications système non configurées sur le serveur.");
  return data.publicKey;
}

async function saveSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/notifications/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serializeSubscription(subscription)),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, "Abonnement Push non enregistré côté 1TASK."));
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
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (support !== "supported") return;

    void (async () => {
      if (Notification.permission === "denied") {
        setEnabled(false);
        setMessage("Notifications système bloquées dans le navigateur.");
        return;
      }

      try {
        const publicKey = await loadPushConfig();
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription) {
          setEnabled(false);
          return;
        }

        if (!sameApplicationServerKey(subscription, publicKey)) {
          await subscription.unsubscribe();
          setEnabled(false);
          setMessage("La clé Push du serveur a changé. Cliquez sur « Activer le push » pour réinscrire cet appareil.");
          return;
        }

        await saveSubscription(subscription);
        setEnabled(true);
        setMessage("");
      } catch (error) {
        setEnabled(false);
        setMessage(error instanceof Error ? error.message : "Synchronisation des notifications système impossible.");
      }
    })();
  }, [support]);

  async function enable() {
    setBusy(true);
    setMessage("");
    let createdSubscription: PushSubscription | null = null;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEnabled(false);
        setMessage("Autorisation refusée. Activez les notifications dans les réglages du navigateur.");
        return;
      }

      const publicKey = await loadPushConfig();
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      let subscription = await registration.pushManager.getSubscription();

      if (subscription && !sameApplicationServerKey(subscription, publicKey)) {
        await subscription.unsubscribe();
        subscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeKey(publicKey),
        });
        createdSubscription = subscription;
      }

      await saveSubscription(subscription);
      setEnabled(true);
      setMessage("Notifications système activées et enregistrées sur cet appareil.");
    } catch (error) {
      if (createdSubscription) await createdSubscription.unsubscribe().catch(() => undefined);
      setEnabled(false);
      setMessage(error instanceof Error ? error.message : "Activation des notifications système impossible.");
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
        if (!response.ok) throw new Error(await readErrorMessage(response, "Désabonnement Push impossible côté 1TASK."));
        await subscription.unsubscribe();
      }
      setEnabled(false);
      setMessage("Notifications système désactivées sur cet appareil.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Désactivation des notifications système impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function testPush() {
    setTesting(true);
    setMessage("");
    try {
      const response = await fetch("/api/notifications/push-test", { method: "POST" });
      if (!response.ok) throw new Error(await readErrorMessage(response, "Le test Push n’a pas pu être programmé."));
      setMessage("Test Push programmé. Laissez 1TASK en arrière-plan : la notification doit apparaître après le prochain passage de l’outbox.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Le test Push a échoué.");
    } finally {
      setTesting(false);
    }
  }

  if (support === "unsupported") {
    return <p className="text-xs text-slate-500">Les notifications système ne sont pas prises en charge par ce navigateur.</p>;
  }
  if (support === "server") return null;

  return (
    <div className="push-notification-control">
      <div className="push-notification-actions">
        <button
          type="button"
          disabled={busy || testing}
          onClick={() => void (enabled ? disable() : enable())}
          className={enabled ? "button-secondary" : "button-primary"}
        >
          {busy ? "Mise à jour…" : enabled ? "Push activé" : "Activer le push"}
        </button>
        {enabled ? (
          <button type="button" disabled={busy || testing} onClick={() => void testPush()} className="button-secondary">
            {testing ? "Test…" : "Tester le push"}
          </button>
        ) : null}
      </div>
      {message ? <p className="push-notification-status" role="status">{message}</p> : null}
    </div>
  );
}
