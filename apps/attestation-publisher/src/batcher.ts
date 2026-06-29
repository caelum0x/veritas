// Builds a Merkle batch from a drain of the attestation queue.

import { sha256Hex } from "@veritas/core";
import type { ContentHash } from "@veritas/core";
import type { QueueEntry } from "./queue.js";

export interface MerkleBatch {
  /** Ordered leaf hashes (one per queue entry). */
  readonly leaves: readonly ContentHash[];
  /** Report IDs corresponding to each leaf (same order). */
  readonly reportIds: readonly string[];
  /** Computed Merkle root over the leaves. */
  readonly merkleRoot: ContentHash;
  /** Unix timestamp (ms) when the batch was built. */
  readonly builtAt: number;
}

/** Compute a binary Merkle root from an ordered list of hex hash strings. */
function computeMerkleRoot(hashes: readonly ContentHash[]): ContentHash {
  if (hashes.length === 0) throw new Error("Cannot build Merkle root from empty list");

  let nodes: string[] = hashes.map((h) => (h.startsWith("sha256:") ? h.slice(7) : h));

  while (nodes.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i]!;
      const right = nodes[i + 1] ?? left;
      next.push(sha256Hex(left + right));
    }
    nodes = next;
  }

  return `sha256:${nodes[0]}` as ContentHash;
}

/** Build a MerkleBatch from an array of drained queue entries. */
export function buildBatch(entries: readonly QueueEntry[]): MerkleBatch {
  if (entries.length === 0) throw new Error("Cannot build batch from empty entries");

  const leaves = entries.map((e) => e.hash);
  const reportIds = entries.map((e) => e.reportId);
  const merkleRoot = computeMerkleRoot(leaves);

  return Object.freeze({ leaves, reportIds, merkleRoot, builtAt: Date.now() });
}
