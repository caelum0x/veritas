// retention.ts: applies retention policies to prune expired backups from the store.
import { ok, err, type Result } from "@veritas/core";
import type { BackupManifest, RetentionPolicy } from "./types.js";
import type { BackupStorePort } from "./store.js";
import type { BackupError } from "./errors.js";

export interface RetentionResult {
  readonly kept: readonly BackupManifest[];
  readonly pruned: readonly BackupManifest[];
}

/**
 * Evaluate which manifests should be pruned according to the policy.
 * Manifests are sorted newest-first before evaluation.
 * Pinned tags are evaluated last to prevent deletion regardless of age or count.
 */
export function evaluateRetention(
  manifests: readonly BackupManifest[],
  policy: RetentionPolicy,
  now: Date = new Date(),
): RetentionResult {
  const sorted = [...manifests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - policy.keepDays);

  const kept: BackupManifest[] = [];
  const pruned: BackupManifest[] = [];

  let fullCount = 0;

  for (const m of sorted) {
    if (isPinned(m, policy.pinnedTags)) {
      kept.push(m);
      continue;
    }

    const createdAt = new Date(m.createdAt);
    const withinDays = createdAt >= cutoff;
    const isFullKept = m.kind === "full" && fullCount < policy.keepLastN;

    if (withinDays || isFullKept) {
      kept.push(m);
      if (m.kind === "full") fullCount++;
    } else {
      pruned.push(m);
    }
  }

  return { kept, pruned };
}

/** Apply retention by deleting pruned manifests and their chunks from the store. */
export async function applyRetention(
  manifests: readonly BackupManifest[],
  policy: RetentionPolicy,
  store: BackupStorePort,
  now: Date = new Date(),
): Promise<Result<RetentionResult, BackupError>> {
  const { kept, pruned } = evaluateRetention(manifests, policy, now);

  for (const m of pruned) {
    const chunkResult = await store.deleteChunks(m.snapshotId);
    if (!chunkResult.ok) return chunkResult;

    const manifestResult = await store.deleteManifest(m.id);
    if (!manifestResult.ok) return manifestResult;
  }

  return ok({ kept, pruned });
}

function isPinned(
  manifest: BackupManifest,
  pinnedTags?: Record<string, string>,
): boolean {
  if (!pinnedTags) return false;
  return Object.entries(pinnedTags).every(
    ([k, v]) => manifest.tags[k] === v,
  );
}
