// Mapper between Delivery domain objects and raw persistence rows.

import type { Delivery, CreateDelivery } from "@veritas/contracts";
import { newId, epochToIso, systemClock, asIsoTimestamp } from "@veritas/core";

/** Persistence row shape for a Delivery (mirrors domain type, stored as plain JSON). */
export type DeliveryRow = {
  readonly id: string;
  readonly orderId: string;
  readonly reportId: string | null;
  readonly status: string;
  readonly contentHash: string | null;
  readonly report: unknown | null;
  readonly deliveredAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Map a CreateDelivery DTO to a new DeliveryRow with generated id and timestamps. */
export function toDeliveryRow(dto: CreateDelivery, id: string, now: string): DeliveryRow {
  return {
    id,
    orderId: dto.orderId,
    reportId: dto.reportId ?? null,
    status: "PENDING",
    contentHash: null,
    report: null,
    deliveredAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Map a persisted DeliveryRow to a Delivery domain object. */
export function fromDeliveryRow(row: DeliveryRow): Delivery {
  return {
    id: row.id as Delivery["id"],
    orderId: row.orderId as Delivery["orderId"],
    reportId: (row.reportId ?? null) as Delivery["reportId"],
    status: row.status as Delivery["status"],
    contentHash: (row.contentHash ?? null) as Delivery["contentHash"],
    report: (row.report ?? null) as Delivery["report"],
    deliveredAt: row.deliveredAt ?? null,
    createdAt: asIsoTimestamp(row.createdAt),
    updatedAt: asIsoTimestamp(row.updatedAt),
  };
}

/** Merge update fields into an existing DeliveryRow, refreshing updatedAt. */
export function mergeDeliveryRow(
  existing: DeliveryRow,
  patch: Partial<DeliveryRow>,
  now: string
): DeliveryRow {
  return {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
}

/** Create a fresh id and ISO timestamp for delivery creation. */
export function newDeliveryId(): string {
  return newId("dlv");
}

/** Get a current ISO timestamp from the system clock. */
export function nowIso(): string {
  return epochToIso(systemClock.now());
}
