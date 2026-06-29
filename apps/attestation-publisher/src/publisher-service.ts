// Core service: dequeues pending hashes, builds a Merkle batch, anchors it on-chain.

import { isOk, epochToIso } from "@veritas/core";
import type { ContentHash, Result } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import { AttestationQueue } from "./queue.js";
import { buildBatch } from "./batcher.js";
import type { AnchorSubmitPort } from "./submit.js";
import { AnchorStatusTracker } from "./status.js";
import type { AnchorRecord } from "./status.js";
import type { PublisherConfig } from "./config.js";
import type { HexString } from "@veritas/blockchain";

export interface PublishResult {
  readonly txHash: HexString;
  readonly merkleRoot: ContentHash;
  readonly leafCount: number;
  readonly skipped: boolean;
}

/** Orchestrates draining the queue, building a Merkle batch, and anchoring it. */
export class PublisherService {
  constructor(
    private readonly queue: AttestationQueue,
    private readonly submit: AnchorSubmitPort,
    private readonly tracker: AnchorStatusTracker,
    private readonly config: PublisherConfig,
    private readonly logger: Logger,
  ) {}

  /** Enqueue a content hash for the next anchoring cycle. */
  enqueue(hash: ContentHash, reportId: string): void {
    this.queue.enqueue(hash, reportId);
    this.logger.info("hash enqueued for anchoring", { reportId, queueSize: this.queue.size });
  }

  /**
   * Attempt to drain up to `batchSize` entries, build a batch, and anchor it.
   * Returns skipped=true when the queue is empty.
   */
  async publishBatch(): Promise<Result<PublishResult>> {
    if (this.queue.isEmpty) {
      return {
        ok: true,
        value: { txHash: "0x" as HexString, merkleRoot: "sha256:" as ContentHash, leafCount: 0, skipped: true },
      };
    }

    const entries = this.queue.drain(this.config.batchSize);
    if (entries.length === 0) {
      return {
        ok: true,
        value: { txHash: "0x" as HexString, merkleRoot: "sha256:" as ContentHash, leafCount: 0, skipped: true },
      };
    }

    const batch = buildBatch(entries);

    this.logger.info(
      "submitting anchor batch",
      { leafCount: entries.length, merkleRoot: batch.merkleRoot },
    );

    const submitResult = await this.submit.submit({
      merkleRoot: batch.merkleRoot,
      contractAddress: this.config.contractAddress,
      chainId: this.config.chainId,
    });

    if (!isOk(submitResult)) {
      // Requeue the entries so they are retried in the next cycle.
      this.queue.requeue(entries);
      this.logger.error(
        "anchor submission failed; entries requeued",
        { err: submitResult.error, leafCount: entries.length },
      );
      return submitResult as Result<never>;
    }

    const receipt = submitResult.value;

    const record: Omit<AnchorRecord, "status"> = {
      txHash: receipt.txHash,
      merkleRoot: batch.merkleRoot,
      chainId: this.config.chainId,
      leafCount: entries.length,
      submittedAt: epochToIso(Date.now()),
      blockNumber: receipt.blockNumber,
    };

    this.tracker.track(record);

    if (receipt.status === "reverted") {
      this.tracker.fail(receipt.txHash, "transaction reverted on-chain");
      this.queue.requeue(entries);
      return {
        ok: false,
        error: new Error(`Anchor tx reverted: ${receipt.txHash}`),
      } as unknown as Result<PublishResult>;
    }

    this.tracker.confirm(receipt.txHash, receipt.anchoredAt);

    this.logger.info(
      "batch anchored on-chain",
      { txHash: receipt.txHash, leafCount: entries.length, merkleRoot: batch.merkleRoot },
    );

    return {
      ok: true,
      value: {
        txHash: receipt.txHash,
        merkleRoot: batch.merkleRoot,
        leafCount: entries.length,
        skipped: false,
      },
    };
  }

  /** Current queue depth. */
  get pendingCount(): number {
    return this.queue.size;
  }
}
