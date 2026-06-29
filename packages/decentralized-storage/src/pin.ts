// Pinning port and in-memory implementation: ensures blobs are persisted by a pinning service.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { CID } from "./cid.js";
import { pinError, unavailableError } from "./errors.js";
import type { StorageError } from "./errors.js";

/** Status of a pin request. */
export type PinStatus = "queued" | "pinning" | "pinned" | "failed";

/** Record describing a pinned CID. */
export interface PinRecord {
  readonly cid: CID;
  readonly status: PinStatus;
  readonly pinnedAt: string | null; // ISO timestamp when pinned; null if pending
  readonly meta: Readonly<Record<string, string>>;
}

/** Port for a pinning service backend. */
export interface PinningService {
  /** Submit a CID for pinning. Idempotent. */
  pin(cid: CID, meta?: Readonly<Record<string, string>>): Promise<Result<PinRecord, StorageError>>;

  /** Unpin a CID. Idempotent: missing pin is not an error. */
  unpin(cid: CID): Promise<Result<void, StorageError>>;

  /** Query the pin status for a CID. */
  status(cid: CID): Promise<Result<PinRecord | null, StorageError>>;

  /** List all pins tracked by this service. */
  list(): Promise<Result<ReadonlyArray<PinRecord>, StorageError>>;
}

/** In-memory pinning service for testing and local development. */
export class MemoryPinningService implements PinningService {
  private readonly pins = new Map<CID, PinRecord>();

  async pin(
    cid: CID,
    meta: Readonly<Record<string, string>> = {}
  ): Promise<Result<PinRecord, StorageError>> {
    const existing = this.pins.get(cid);
    if (existing?.status === "pinned") return ok(existing);
    const record: PinRecord = {
      cid,
      status: "pinned",
      pinnedAt: new Date().toISOString(),
      meta,
    };
    this.pins.set(cid, record);
    return ok(record);
  }

  async unpin(cid: CID): Promise<Result<void, StorageError>> {
    this.pins.delete(cid);
    return ok(undefined);
  }

  async status(cid: CID): Promise<Result<PinRecord | null, StorageError>> {
    return ok(this.pins.get(cid) ?? null);
  }

  async list(): Promise<Result<ReadonlyArray<PinRecord>, StorageError>> {
    return ok([...this.pins.values()]);
  }
}

/** Stub pinning service that always fails — useful to simulate outages in tests. */
export class FailingPinningService implements PinningService {
  async pin(): Promise<Result<PinRecord, StorageError>> {
    return err(pinError("Pinning service unavailable (stub)"));
  }

  async unpin(): Promise<Result<void, StorageError>> {
    return err(unavailableError("Pinning service unavailable (stub)"));
  }

  async status(): Promise<Result<PinRecord | null, StorageError>> {
    return err(unavailableError("Pinning service unavailable (stub)"));
  }

  async list(): Promise<Result<ReadonlyArray<PinRecord>, StorageError>> {
    return err(unavailableError("Pinning service unavailable (stub)"));
  }
}
