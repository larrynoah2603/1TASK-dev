import webpush from "web-push";
import { prisma } from "@/lib/db";
import { readServerEnvironment } from "@/lib/env";

export async function deliverPushNotification(notificationId: string) {
  const environment = readServerEnvironment();
  if (!environment.WEB_PUSH_PUBLIC_KEY || !environment.WEB_PUSH_PRIVATE_KEY || !environment.WEB_PUSH_SUBJECT) throw new Error("Web Push is not configured");
  webpush.setVapidDetails(environment.WEB_PUSH_SUBJECT, environment.WEB_PUSH_PUBLIC_KEY, environment.WEB_PUSH_PRIVATE_KEY);
  const notification = await prisma.notification.findUnique({ where: { id: notificationId }, include: { recipient: { select: { pushSubscriptions: true } } } });
  if (!notification) return { delivered: 0 };
  let delivered = 0;
  for (const subscription of notification.recipient.pushSubscriptions) {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: notification.title, body: notification.body, severity: notification.severity, actionUrl: notification.actionUrl ?? "/notifications" }));
      await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { lastUsedAt: new Date() } });
      delivered += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) await prisma.pushSubscription.delete({ where: { id: subscription.id } });
      else throw error;
    }
  }
  await prisma.notification.update({ where: { id: notificationId }, data: { status: "SENT", sentAt: new Date() } });
  return { delivered };
}
