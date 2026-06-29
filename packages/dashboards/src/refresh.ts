// Refresh policy definitions and scheduling logic for dashboard auto-refresh.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { RefreshPolicyError } from "./errors.js";
import type { DashboardId } from "./types.js";

export const RefreshIntervalSchema = z.enum(["off", "30s", "1m", "5m", "15m", "30m", "1h"]);
export type RefreshInterval = z.infer<typeof RefreshIntervalSchema>;

export const RefreshPolicySchema = z.object({
  dashboardId: z.string(),
  interval: RefreshIntervalSchema,
  enabled: z.boolean(),
  lastRefreshedAt: z.string().nullable(),
  nextRefreshAt: z.string().nullable(),
});
export type RefreshPolicy = z.infer<typeof RefreshPolicySchema>;

const INTERVAL_MS: Record<RefreshInterval, number | null> = {
  off: null,
  "30s": 30_000,
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "1h": 3_600_000,
};

export function makeRefreshPolicy(
  dashboardId: DashboardId,
  interval: RefreshInterval,
  enabled: boolean,
): RefreshPolicy {
  return {
    dashboardId: dashboardId as string,
    interval,
    enabled,
    lastRefreshedAt: null,
    nextRefreshAt: computeNextRefreshAt(interval, null),
  };
}

export function computeNextRefreshAt(
  interval: RefreshInterval,
  fromIso: string | null,
): string | null {
  const ms = INTERVAL_MS[interval];
  if (ms === null) return null;
  const base = fromIso ? new Date(fromIso).getTime() : Date.now();
  return new Date(base + ms).toISOString();
}

export function markRefreshed(policy: RefreshPolicy): RefreshPolicy {
  const now = new Date().toISOString();
  return {
    ...policy,
    lastRefreshedAt: now,
    nextRefreshAt: computeNextRefreshAt(policy.interval, now),
  };
}

export function isDueForRefresh(policy: RefreshPolicy): boolean {
  if (!policy.enabled || policy.interval === "off") return false;
  if (policy.nextRefreshAt === null) return false;
  return new Date(policy.nextRefreshAt).getTime() <= Date.now();
}

export function updateRefreshInterval(
  policy: RefreshPolicy,
  interval: RefreshInterval,
): Result<RefreshPolicy, RefreshPolicyError> {
  const parsed = RefreshIntervalSchema.safeParse(interval);
  if (!parsed.success) {
    return err(new RefreshPolicyError(`Unknown interval: ${interval}`));
  }
  return ok({ ...policy, interval, nextRefreshAt: computeNextRefreshAt(interval, null) });
}

/** In-memory registry mapping dashboardId -> active refresh policy. */
export class InMemoryRefreshRegistry {
  readonly #policies = new Map<string, RefreshPolicy>();

  set(policy: RefreshPolicy): void {
    this.#policies.set(policy.dashboardId, policy);
  }

  get(dashboardId: DashboardId): RefreshPolicy | undefined {
    return this.#policies.get(dashboardId as string);
  }

  remove(dashboardId: DashboardId): void {
    this.#policies.delete(dashboardId as string);
  }

  allDue(): readonly RefreshPolicy[] {
    return Array.from(this.#policies.values()).filter(isDueForRefresh);
  }
}
