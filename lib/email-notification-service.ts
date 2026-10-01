import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readServerEnvironment, type ServerEnvironment } from "@/lib/env";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_REFRESH_MARGIN_MS = 60_000;

let tokenCache: { accessToken: string; expiresAt: number; clientId: string; tenantId: string } | null = null;

export class MicrosoftGraphMailError extends Error {
  constructor(public readonly status: number | null, public readonly retryAfterMs?: number) {
    super(status === null ? "Microsoft Graph mail network request failed" : `Microsoft Graph mail request failed (${status})`);
    this.name = "MicrosoftGraphMailError";
  }
}

function requireMailEnvironment(environment: ServerEnvironment) {
  const { MICROSOFT_MAIL_TENANT_ID: tenantId, MICROSOFT_MAIL_CLIENT_ID: clientId, MICROSOFT_MAIL_CLIENT_SECRET: clientSecret, MICROSOFT_MAIL_SENDER: sender } = environment;
  if (!tenantId || !clientId || !clientSecret || !sender) throw new Error("Microsoft Graph mail is not configured");
  return { tenantId, clientId, clientSecret, sender };
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

async function graphFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new MicrosoftGraphMailError(null);
  }
}

async function getGraphAccessToken(environment: ServerEnvironment): Promise<string> {
  const { tenantId, clientId, clientSecret } = requireMailEnvironment(environment);
  if (tokenCache && tokenCache.tenantId === tenantId && tokenCache.clientId === clientId && tokenCache.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) return tokenCache.accessToken;

  const response = await graphFetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: GRAPH_SCOPE, grant_type: "client_credentials" }),
  });
  if (!response.ok) throw new MicrosoftGraphMailError(response.status, parseRetryAfter(response.headers.get("retry-after")));
  const token = await response.json() as { access_token?: string; expires_in?: number };
  if (!token.access_token) throw new MicrosoftGraphMailError(response.status);
  tokenCache = { accessToken: token.access_token, expiresAt: Date.now() + Math.max(0, token.expires_in ?? 3_600) * 1_000, clientId, tenantId };
  return token.access_token;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function safeActionUrl(actionUrl: string | null, baseUrl: string | undefined): string | null {
  if (!actionUrl || !baseUrl) return null;
  try {
    const base = new URL(baseUrl);
    const action = new URL(actionUrl, base);
    return action.origin === base.origin && ["http:", "https:"].includes(action.protocol) ? action.toString() : null;
  } catch {
    return null;
  }
}

export function buildEmailContent(input: { title: string; body: string; severity: string; actionUrl: string | null }, baseUrl?: string) {
  const actionUrl = safeActionUrl(input.actionUrl, baseUrl);
  const severity = input.severity === "INFO" ? "" : `Niveau : ${input.severity}\n\n`;
  const text = `1TASK\n\n${input.title}\n\n${input.body}\n\n${severity}${actionUrl ? `Consulter dans 1TASK : ${actionUrl}\n` : ""}`.trim();
  const html = `<div style="font-family:Arial,sans-serif;color:#202124;line-height:1.5"><p style="font-weight:700">1TASK</p><h2>${escapeHtml(input.title)}</h2><p>${escapeHtml(input.body).replaceAll("\n", "<br>")}</p>${severity ? `<p><strong>${escapeHtml(severity.trim())}</strong></p>` : ""}${actionUrl ? `<p><a href="${escapeHtml(actionUrl)}">Consulter dans 1TASK</a></p>` : ""}<p style="color:#666;font-size:12px">Notification automatique de 1TASK.</p></div>`;
  return { html, text, actionUrl };
}

export async function deliverEmailNotification(notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId }, include: { recipient: { select: { email: true } } } });
  if (!notification) return { delivered: false, reason: "not-found" } as const;
  if (notification.channel !== NotificationChannel.EMAIL) throw new Error("Notification is not an EMAIL notification");
  if (notification.status !== NotificationStatus.PENDING) return { delivered: false, reason: "not-pending" } as const;
  const recipient = notification.recipient.email.trim();
  if (!recipient) throw new Error("Email notification recipient has no email address");

  const environment = readServerEnvironment();
  const { sender } = requireMailEnvironment(environment);
  const accessToken = await getGraphAccessToken(environment);
  const content = buildEmailContent(notification, environment.NEXTAUTH_URL);
  const response = await graphFetch(`${GRAPH_ROOT}/users/${encodeURIComponent(sender)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { subject: `[1TASK] ${notification.title}`, body: { contentType: "HTML", content: content.html }, toRecipients: [{ emailAddress: { address: recipient } }] }, saveToSentItems: true }),
  });
  if (response.status !== 202) throw new MicrosoftGraphMailError(response.status, parseRetryAfter(response.headers.get("retry-after")));
  await prisma.notification.updateMany({ where: { id: notificationId, channel: NotificationChannel.EMAIL, status: NotificationStatus.PENDING }, data: { status: NotificationStatus.SENT, sentAt: new Date() } });
  return { delivered: true, text: content.text } as const;
}

export function resetMicrosoftGraphTokenCacheForTests() {
  tokenCache = null;
}
