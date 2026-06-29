// Delivery retry view: maps raw API delivery records to typed DeliveryView objects.

import { type IsoTimestamp, epochToIso } from "@veritas/core";
import type { DeliveryView } from "./types.js";

/** Raw delivery record as returned by the Veritas API. */
export interface RawDeliveryRecord {
  readonly id: string;
  readonly subscriptionId: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly attempt: number;
  readonly statusCode: number | null;
  readonly success: boolean;
  readonly error: string | null;
  readonly deliveredAt: string | null;
  readonly nextRetryAt: string | null;
  readonly createdAt: string;
}

/** Parse a raw API delivery record into a strongly-typed DeliveryView. */
export function toDeliveryView(raw: RawDeliveryRecord): DeliveryView {
  return {
    id: raw.id,
    subscriptionId: raw.subscriptionId,
    eventId: raw.eventId,
    eventType: raw.eventType,
    attempt: raw.attempt,
    statusCode: raw.statusCode,
    success: raw.success,
    error: raw.error,
    deliveredAt: raw.deliveredAt ? (raw.deliveredAt as IsoTimestamp) : null,
    nextRetryAt: raw.nextRetryAt ? (raw.nextRetryAt as IsoTimestamp) : null,
    createdAt: raw.createdAt as IsoTimestamp,
  };
}

/** Returns true when the delivery has been exhausted (no further retries scheduled). */
export function isExhausted(view: DeliveryView): boolean {
  return !view.success && view.nextRetryAt === null;
}

/** Returns true when the delivery is still pending a retry. */
export function isPendingRetry(view: DeliveryView): boolean {
  return !view.success && view.nextRetryAt !== null;
}

/** Returns the ISO timestamp of the next retry, or null if none. */
export function nextRetryAt(view: DeliveryView): IsoTimestamp | null {
  return view.nextRetryAt;
}

/** Computes a human-readable duration label between two ISO timestamps. */
export function formatRetryDelay(fromIso: IsoTimestamp, toIso: IsoTimestamp): string {
  const diffMs = Date.parse(toIso) - Date.parse(fromIso);
  if (diffMs < 0) return "0s";
  const secs = Math.round(diffMs / 1_000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.round(mins / 60)}h`;
}

/** Returns a summary string describing the delivery state. */
export function deliverySummary(view: DeliveryView): string {
  if (view.success) return `Delivered on attempt ${view.attempt}`;
  if (isPendingRetry(view)) return `Failed attempt ${view.attempt}; retry at ${view.nextRetryAt}`;
  return `Exhausted after ${view.attempt} attempt(s)`;
}

/** Epoch-ms helper used by the client to build ISO timestamps. */
export function nowIso(): IsoTimestamp {
  return epochToIso(Date.now());
}
