// Track confirmation status of submitted anchor transactions.

import type { HexString } from "@veritas/blockchain";
import type { ContentHash, IsoTimestamp } from "@veritas/core";

export type ConfirmationStatus = "pending" | "confirmed" | "failed";

export interface AnchorRecord {
  readonly txHash: HexString;
  readonly merkleRoot: ContentHash;
  readonly chainId: number;
  readonly leafCount: number;
  readonly submittedAt: IsoTimestamp;
  readonly blockNumber: bigint;
  status: ConfirmationStatus;
  confirmedAt?: IsoTimestamp;
  failureReason?: string;
}

/** In-memory tracker for submitted anchor transaction statuses. */
export class AnchorStatusTracker {
  private readonly records = new Map<HexString, AnchorRecord>();

  /** Register a newly submitted anchor tx. */
  track(record: Omit<AnchorRecord, "status">): void {
    const entry: AnchorRecord = { ...record, status: "pending" };
    this.records.set(record.txHash, entry);
  }

  /** Mark a transaction as confirmed. */
  confirm(txHash: HexString, confirmedAt: IsoTimestamp): boolean {
    const record = this.records.get(txHash);
    if (record === undefined) return false;
    record.status = "confirmed";
    record.confirmedAt = confirmedAt;
    return true;
  }

  /** Mark a transaction as failed. */
  fail(txHash: HexString, reason: string): boolean {
    const record = this.records.get(txHash);
    if (record === undefined) return false;
    record.status = "failed";
    record.failureReason = reason;
    return true;
  }

  /** Look up a record by tx hash. */
  get(txHash: HexString): AnchorRecord | undefined {
    return this.records.get(txHash);
  }

  /** Return all records with a given status. */
  byStatus(status: ConfirmationStatus): readonly AnchorRecord[] {
    return [...this.records.values()].filter((r) => r.status === status);
  }

  /** Total number of tracked records. */
  get size(): number {
    return this.records.size;
  }
}
