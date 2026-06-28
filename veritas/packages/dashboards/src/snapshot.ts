// Dashboard snapshot: captures a point-in-time frozen copy of a dashboard's state.
import { z } from "zod";
import { ok, err, type Result, newId } from "@veritas/core";
import { SnapshotNotFoundError } from "./errors.js";
import { snapshotId, type SnapshotId, type DashboardId } from "./types.js";

export const SnapshotMetaSchema = z.object({
  id: z.string(),
  dashboardId: z.string(),
  label: z.string(),
  createdAt: z.string(),
  createdBy: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});
export type SnapshotMeta = z.infer<typeof SnapshotMetaSchema>;

export interface Snapshot {
  readonly meta: SnapshotMeta;
  readonly payload: Readonly<Record<string, unknown>>;
}

export function makeSnapshot(
  dashboardId: DashboardId,
  label: string,
  createdBy: string,
  payload: Readonly<Record<string, unknown>>,
): Snapshot {
  const raw = JSON.stringify(payload);
  const meta: SnapshotMeta = {
    id: snapshotId(newId("snap")) as string,
    dashboardId: dashboardId as string,
    label,
    createdAt: new Date().toISOString(),
    createdBy,
    sizeBytes: new TextEncoder().encode(raw).byteLength,
  };
  return { meta, payload };
}

/** In-memory snapshot store keyed by snapshotId. */
export class InMemorySnapshotStore {
  readonly #snapshots = new Map<string, Snapshot>();

  save(snapshot: Snapshot): void {
    this.#snapshots.set(snapshot.meta.id, snapshot);
  }

  get(id: SnapshotId): Result<Snapshot, SnapshotNotFoundError> {
    const s = this.#snapshots.get(id as string);
    return s ? ok(s) : err(new SnapshotNotFoundError(id as string));
  }

  listByDashboard(dashboardId: DashboardId): readonly SnapshotMeta[] {
    return Array.from(this.#snapshots.values())
      .filter((s) => s.meta.dashboardId === (dashboardId as string))
      .map((s) => s.meta)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  delete(id: SnapshotId): Result<true, SnapshotNotFoundError> {
    if (!this.#snapshots.has(id as string)) {
      return err(new SnapshotNotFoundError(id as string));
    }
    this.#snapshots.delete(id as string);
    return ok(true);
  }

  deleteByDashboard(dashboardId: DashboardId): number {
    let removed = 0;
    for (const [k, v] of this.#snapshots) {
      if (v.meta.dashboardId === (dashboardId as string)) {
        this.#snapshots.delete(k);
        removed++;
      }
    }
    return removed;
  }
}
