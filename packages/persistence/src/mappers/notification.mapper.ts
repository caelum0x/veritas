// Maps Notification domain objects to/from persistence rows with clone-on-write semantics.
import type { Notification, CreateNotification, NotificationChannel } from "@veritas/contracts";
import { newId, epochToIso, isoToEpoch } from "@veritas/core";

/** Persistence row shape for a Notification. */
export interface NotificationRow {
  readonly id: string;
  readonly userId: string;
  readonly channel: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly readAt: string | null;
  readonly sentAt: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Convert a persistence row to a Notification domain object. */
export function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id as Notification["id"],
    userId: row.userId as Notification["userId"],
    channel: row.channel as NotificationChannel,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.readAt,
    sentAt: row.sentAt,
    ...(row.metadata !== undefined ? { metadata: { ...row.metadata } } : {}),
    createdAt: epochToIso(row.createdAt),
    updatedAt: epochToIso(row.updatedAt),
  };
}

/** Convert a CreateNotification DTO into a persistence row, generating id and timestamps. */
export function createDtoToRow(dto: CreateNotification, now: number): NotificationRow {
  return {
    id: newId("ntf"),
    userId: dto.userId,
    channel: dto.channel,
    type: dto.type,
    title: dto.title,
    body: dto.body,
    readAt: null,
    sentAt: null,
    ...(dto.metadata !== undefined ? { metadata: { ...dto.metadata } } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge a partial Notification update into an existing row, refreshing updatedAt. */
export function mergeNotificationRow(
  existing: NotificationRow,
  patch: Partial<Pick<Notification, "readAt" | "sentAt" | "metadata">>
): NotificationRow {
  return {
    ...existing,
    ...(patch.readAt !== undefined ? { readAt: patch.readAt } : {}),
    ...(patch.sentAt !== undefined ? { sentAt: patch.sentAt } : {}),
    ...(patch.metadata !== undefined ? { metadata: { ...patch.metadata } } : {}),
    updatedAt: Date.now(),
  };
}

/** Convert a Notification domain object back to a persistence row. */
export function notificationToRow(n: Notification): NotificationRow {
  return {
    id: n.id,
    userId: n.userId,
    channel: n.channel,
    type: n.type,
    title: n.title,
    body: n.body,
    readAt: n.readAt,
    sentAt: n.sentAt,
    ...(n.metadata !== undefined ? { metadata: { ...n.metadata } } : {}),
    createdAt: isoToEpoch(n.createdAt) ?? 0,
    updatedAt: isoToEpoch(n.updatedAt) ?? 0,
  };
}
