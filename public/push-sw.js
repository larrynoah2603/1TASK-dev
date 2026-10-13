const DEFAULT_PUSH_ICON = "/push-icon.svg";

async function resolveRequesterIcon(photoUrl) {
  // Only the protected same-origin endpoint may supply an avatar.
  if (typeof photoUrl !== "string" ||
      !/^\\/api\\/notifications\\/push-photo\\/[A-Za-z0-9_-]+$/.test(photoUrl)) {
    return DEFAULT_PUSH_ICON;
  }
  try {
    const response = await fetch(photoUrl, {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return DEFAULT_PUSH_ICON;
    const mime = response.headers.get("content-type")?.split(";")[0]?.toLowerCase();
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mime)) {
      return DEFAULT_PUSH_ICON;
    }
    // The browser resolves this private URL to paint the notification icon.
    return photoUrl;
  } catch {
    return DEFAULT_PUSH_ICON;
  }
}

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const actionUrl = data.actionUrl || "/notifications";
  event.waitUntil((async () => {
    const icon = await resolveRequesterIcon(data.requesterPhotoUrl);
    await self.registration.showNotification(data.title || "1TASK", {
      body: data.body || "",
      icon,
      badge: DEFAULT_PUSH_ICON,
      tag: data.notificationId || undefined,
      data: { actionUrl },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const actionUrl = event.notification.data?.actionUrl || "/notifications";
  const requestedUrl = new URL(actionUrl, self.location.origin);
  const targetUrl = requestedUrl.origin === self.location.origin
    ? requestedUrl.href
    : new URL("/notifications", self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("navigate" in client) await client.navigate(targetUrl);
      if ("focus" in client) return client.focus();
    }
    return clients.openWindow(targetUrl);
  })());
});
