// Batch multiple report hashes into a Merkle-like root and anchor it on-chain

import { ok, err, sha256Hex, epochToIso } from "@veritas/core";
import type { ContentHash, Result, IsoTimestamp } from "@veritas/core";
import { Anchor } from "./anchor.js";
import type { EvmAddress } from "@veritas/blockchain";
import type { HexString } from "@veritas/blockchain";

export interface BatchAnchorRequest {
  /** Ordered list of content hashes to batch (at least one). */
  readonly hashes: readonly ContentHash[];
  /** Target anchor contract address. */
  readonly contractAddress: EvmAddress;
}

export interface BatchAnchorResult {
  readonly txHash: HexString;
  readonly merkleRoot: ContentHash;
  readonly count: number;
  readonly blockNumber: bigint;
  readonly anchoredAt: IsoTimestamp;
  /** Individual leaf hashes in the same order as the input. */
  readonly leaves: readonly ContentHash[];
}

/** Compute a binary Merkle root from an ordered list of content hashes. */
function computeMerkleRoot(hashes: readonly ContentHash[]): ContentHash {
  if (hashes.length === 0) throw new Error("Cannot compute Merkle root of empty list");

  // Convert leaves to raw hex strings for hashing.
  let nodes: string[] = hashes.map((h) =>
    h.startsWith("sha256:") ? h.slice(7) : h
  );

  while (nodes.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i]!;
      const right = nodes[i + 1] ?? left; // duplicate last node for odd counts
      next.push(sha256Hex(left + right));
    }
    nodes = next;
  }

  return `sha256:${nodes[0]}` as ContentHash;
}

/** Anchors a batch of report hashes as a single Merkle root transaction. */
export class BatchAnchor {
  private readonly anchor: Anchor;

  constructor(anchor: Anchor) {
    this.anchor = anchor;
  }

  async anchorBatch(req: BatchAnchorRequest): Promise<Result<BatchAnchorResult>> {
    if (req.hashes.length === 0) {
      return err(new Error("Batch must contain at least one hash"));
    }

    const merkleRoot = computeMerkleRoot(req.hashes);

    const anchorResult = await this.anchor.anchorRoot({
      root: merkleRoot,
      contractAddress: req.contractAddress,
    });

    if (!anchorResult.ok) return err(anchorResult.error);

    return ok({
      txHash: anchorResult.value.txHash,
      merkleRoot,
      count: req.hashes.length,
      blockNumber: anchorResult.value.blockNumber,
      anchoredAt: anchorResult.value.anchoredAt,
      leaves: req.hashes,
    });
  }
}

/** Build a BatchAnchor from an OnchainPort-backed Anchor instance. */
export function makeBatchAnchor(anchor: Anchor): BatchAnchor {
  return new BatchAnchor(anchor);
}
