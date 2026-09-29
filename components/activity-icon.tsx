import {
  Bell,
  CheckCircle2,
  CircleCheck,
  CircleX,
  Clock,
  FilePlus2,
  MessageSquare,
  PackagePlus,
  Pencil,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { AssetRequestStatus, NotificationType, TicketEventType } from "@prisma/client";

export type ActivityType = NotificationType | TicketEventType | AssetRequestStatus;

export const ACTIVITY_ICON_MAP: Partial<Record<ActivityType, LucideIcon>> = {
  TICKET_CREATED: FilePlus2,
  CREATED: FilePlus2,
  QUEUE_NEW_TICKET: FilePlus2,
  TICKET_ASSIGNED: UserCheck,
  ASSIGNED: UserCheck,
  STATUS_CHANGED: Pencil,
  QUALIFIED: Pencil,
  QUEUE_CHANGED: Pencil,
  MESSAGE_ADDED: MessageSquare,
  INFORMATION_REQUESTED: MessageSquare,
  SLA_ALERT: Clock,
  SLA_BREACH: Clock,
  SLA_EXCEPTION_CREATED: Clock,
  TICKET_RESOLVED: CircleCheck,
  RESOLUTION_SUBMITTED: CircleCheck,
  TICKET_REOPENED: Pencil,
  REOPENED: Pencil,
  CLOSED: CheckCircle2,
  PENDING: PackagePlus,
  APPROVED: CircleCheck,
  REJECTED: CircleX,
  CONFIDENTIAL_ACCESS: ShieldCheck,
  CONFIDENTIAL_ACCESS_GRANTED: ShieldCheck,
  CONFIDENTIAL_ACCESS_REVOKED: ShieldCheck,
  ADMINISTRATIVE_ACTION: ShieldCheck,
};

export function ActivityIcon({ type, label, className = "" }: { type?: ActivityType | string | null; label?: string; className?: string }) {
  const Icon = type ? ACTIVITY_ICON_MAP[type as ActivityType] ?? Bell : Bell;
  const accessibleLabel = label ?? (type ? `Activité ${type.toLowerCase().replaceAll("_", " ")}` : "Activité");
  return <Icon className={`activity-icon ${className}`.trim()} size={18} strokeWidth={1.8} role="img" aria-label={accessibleLabel} />;
}

export function formatRelativeActivityDate(value: string | Date, now = new Date()) {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return "à l’instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(date);
}
