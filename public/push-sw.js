self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const actionUrl = data.actionUrl || "/notifications";
  event.waitUntil(
    self.registration.showNotification(data.title || "1TASK", {
      body: data.body || "",
      tag: data.notificationId || undefined,
      data: { actionUrl },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const actionUrl = event.notification.data?.actionUrl || "/notifications";
  const targetUrl = new URL(actionUrl, self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("navigate" in client) await client.navigate(targetUrl);
      if ("focus" in client) return client.focus();
    }
    return clients.openWindow(targetUrl);
  })());
});
