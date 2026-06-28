// Region failover: drives automatic promotion to a healthy region when the active region fails.
import { ok, err, type Result, epochToIso } from "@veritas/core";
import type { Region } from "./region.js";
import { isRegionHealthy } from "./region.js";
import type { RegionId } from "./types.js";
import { FailoverExhaustedError, RegionNotFoundError } from "./errors.js";

export type FailoverMode = "automatic" | "manual" | "disabled";

export interface FailoverPolicy {
  readonly mode: FailoverMode;
  readonly maxAttempts: number;
  readonly preferredFallbacks: ReadonlyArray<RegionId>;
}

export const DEFAULT_FAILOVER_POLICY: FailoverPolicy = {
  mode: "automatic",
  maxAttempts: 3,
  preferredFallbacks: [],
};

export interface FailoverResult {
  readonly originalRegionId: RegionId;
  readonly targetRegionId: RegionId;
  readonly targetRegion: Region;
  readonly attemptedRegions: ReadonlyArray<RegionId>;
  readonly reason: string;
  readonly failedAt: string;
}

export interface FailoverPort {
  recordFailover(result: FailoverResult): Promise<void>;
}

export class InMemoryFailoverPort implements FailoverPort {
  private readonly history: FailoverResult[] = [];

  async recordFailover(result: FailoverResult): Promise<void> {
    this.history.push(result);
  }

  getHistory(): ReadonlyArray<FailoverResult> {
    return this.history;
  }
}

export function selectFailoverTarget(
  failingRegionId: RegionId,
  allRegions: ReadonlyArray<Region>,
  policy: FailoverPolicy,
  reason: string,
): Result<FailoverResult, FailoverExhaustedError | RegionNotFoundError> {
  if (policy.mode === "disabled") {
    return err(new FailoverExhaustedError([failingRegionId]));
  }

  const attempted: RegionId[] = [failingRegionId];

  const candidates = buildCandidateList(failingRegionId, allRegions, policy);

  for (const candidate of candidates) {
    if (attempted.length >= policy.maxAttempts + 1) break;
    if (isRegionHealthy(candidate)) {
      const result: FailoverResult = {
        originalRegionId: failingRegionId,
        targetRegionId: candidate.id,
        targetRegion: candidate,
        attemptedRegions: attempted,
        reason,
        failedAt: epochToIso(Date.now()),
      };
      return ok(result);
    }
    attempted.push(candidate.id);
  }

  return err(new FailoverExhaustedError(attempted));
}

function buildCandidateList(
  failingRegionId: RegionId,
  allRegions: ReadonlyArray<Region>,
  policy: FailoverPolicy,
): ReadonlyArray<Region> {
  const preferred = policy.preferredFallbacks
    .map((id) => allRegions.find((r) => r.id === id))
    .filter((r): r is Region => r !== undefined && r.id !== failingRegionId);

  const remainingPrimaries = allRegions.filter(
    (r) => r.id !== failingRegionId && r.tier === "primary" && !preferred.some((p) => p.id === r.id),
  );

  const remainingSecondaries = allRegions.filter(
    (r) =>
      r.id !== failingRegionId &&
      r.tier !== "primary" &&
      !preferred.some((p) => p.id === r.id),
  );

  return [...preferred, ...remainingPrimaries, ...remainingSecondaries];
}
