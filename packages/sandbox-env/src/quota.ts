// quota.ts: sandbox quota definitions and enforcement logic.

import { type Result, ok, err } from "@veritas/core";
import { type SandboxQuota, type SandboxUsage, type SandboxTier } from "./types.js";
import { SandboxQuotaExceededError } from "./errors.js";

/** Default quota limits per sandbox tier. */
export const TIER_QUOTAS: Readonly<Record<SandboxTier, SandboxQuota>> = {
  trial: {
    maxRequestsPerMinute: 20,
    maxRequestsPerDay: 500,
    maxConcurrentRequests: 2,
    maxStorageMb: 50,
    maxWebhooks: 1,
  },
  developer: {
    maxRequestsPerMinute: 100,
    maxRequestsPerDay: 10000,
    maxConcurrentRequests: 5,
    maxStorageMb: 500,
    maxWebhooks: 5,
  },
  partner: {
    maxRequestsPerMinute: 1000,
    maxRequestsPerDay: 100000,
    maxConcurrentRequests: 50,
    maxStorageMb: 5000,
    maxWebhooks: 25,
  },
  enterprise: {
    maxRequestsPerMinute: 10000,
    maxRequestsPerDay: 1000000,
    maxConcurrentRequests: 500,
    maxStorageMb: 50000,
    maxWebhooks: 100,
  },
};

export interface QuotaCheckRequest {
  readonly sandboxId: string;
  readonly quota: SandboxQuota;
  readonly usage: SandboxUsage;
  readonly additionalRequests?: number;
  readonly additionalStorageMb?: number;
}

/** Checks current usage against quota limits; returns error on first violation. */
export function checkQuota(
  req: QuotaCheckRequest,
): Result<void, SandboxQuotaExceededError> {
  const { sandboxId, quota, usage, additionalRequests = 1, additionalStorageMb = 0 } = req;

  const projectedDaily = usage.requestCount + additionalRequests;
  if (projectedDaily > quota.maxRequestsPerDay) {
    return err(
      new SandboxQuotaExceededError(sandboxId, "daily_requests"),
    );
  }

  const projectedStorage = usage.storageUsedMb + additionalStorageMb;
  if (projectedStorage > quota.maxStorageMb) {
    return err(
      new SandboxQuotaExceededError(sandboxId, "storage"),
    );
  }

  return ok(undefined);
}

/** Returns the remaining request budget for the day given current usage. */
export function remainingDailyRequests(quota: SandboxQuota, usage: SandboxUsage): number {
  return Math.max(0, quota.maxRequestsPerDay - usage.requestCount);
}

/** Returns the remaining storage budget in MB given current usage. */
export function remainingStorageMb(quota: SandboxQuota, usage: SandboxUsage): number {
  return Math.max(0, quota.maxStorageMb - usage.storageUsedMb);
}

/** Returns a percentage (0-100) of storage consumed. */
export function storageUtilizationPercent(quota: SandboxQuota, usage: SandboxUsage): number {
  if (quota.maxStorageMb === 0) return 100;
  return Math.min(100, (usage.storageUsedMb / quota.maxStorageMb) * 100);
}
