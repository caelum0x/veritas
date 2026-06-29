// Flag and resolve detected contradictions with status tracking.
import { newId } from "@veritas/core";
import type { ContradictionCluster } from "./cluster.js";

export type ResolutionStatus =
  | "unresolved"
  | "flagged"
  | "escalated"
  | "resolved"
  | "dismissed";

export interface ContradictionFlag {
  readonly flagId: string;
  readonly cluster: ContradictionCluster;
  readonly status: ResolutionStatus;
  readonly flaggedAt: string;
  readonly resolvedAt?: string;
  readonly resolution?: string;
  readonly resolvedBy?: string;
}

export interface ResolveOptions {
  readonly resolution: string;
  readonly resolvedBy?: string;
}

/** Create a new flag for a contradiction cluster */
export function flagCluster(
  cluster: ContradictionCluster,
): ContradictionFlag {
  return {
    flagId: newId("flag"),
    cluster,
    status: "flagged",
    flaggedAt: new Date().toISOString(),
  };
}

/** Escalate a flagged contradiction for human review */
export function escalateFlag(
  flag: ContradictionFlag,
): ContradictionFlag {
  if (flag.status === "resolved" || flag.status === "dismissed") {
    return flag;
  }
  return { ...flag, status: "escalated" };
}

/** Mark a contradiction flag as resolved */
export function resolveFlag(
  flag: ContradictionFlag,
  opts: ResolveOptions,
): ContradictionFlag {
  return {
    ...flag,
    status: "resolved",
    resolvedAt: new Date().toISOString(),
    resolution: opts.resolution,
    resolvedBy: opts.resolvedBy,
  };
}

/** Dismiss a contradiction flag as a false positive */
export function dismissFlag(
  flag: ContradictionFlag,
  reason: string,
): ContradictionFlag {
  return {
    ...flag,
    status: "dismissed",
    resolvedAt: new Date().toISOString(),
    resolution: reason,
  };
}

/** Bulk-flag all clusters from a detection pass */
export function flagAll(
  clusters: ReadonlyArray<ContradictionCluster>,
): ReadonlyArray<ContradictionFlag> {
  return clusters.map(flagCluster);
}
