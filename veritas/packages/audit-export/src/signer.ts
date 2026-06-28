// Tamper-evident chaining: each audit event hash includes the previous hash for log integrity.

import { createHash } from "node:crypto";
import { Result, ok, err } from "@veritas/core";
import { type AuditEvent, type ChainedEvent } from "./types.js";
import { ChainIntegrityError } from "./errors.js";

function hashEvent(event: AuditEvent, previousHash: string): string {
  const payload = JSON.stringify({
    id: event.id,
    timestamp: event.timestamp,
    action: event.action,
    category: event.category,
    severity: event.severity,
    actorId: event.actor.id,
    resourceId: event.resource.id,
    resourceType: event.resource.type,
    outcome: event.outcome,
    previousHash,
  });
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export function chainEvent(
  event: AuditEvent,
  previousHash: string,
  sequenceNumber: number,
): ChainedEvent {
  const chainHash = hashEvent(event, previousHash);
  const signedEvent: AuditEvent = { ...event, previousHash, hash: chainHash };
  return { event: signedEvent, chainHash, sequenceNumber };
}

export function chainEvents(events: readonly AuditEvent[]): ChainedEvent[] {
  let previousHash = GENESIS_HASH;
  return events.map((event, index) => {
    const chained = chainEvent(event, previousHash, index);
    previousHash = chained.chainHash;
    return chained;
  });
}

export function verifyChain(
  chainedEvents: readonly ChainedEvent[],
): Result<true, ChainIntegrityError> {
  let expectedPreviousHash = GENESIS_HASH;

  for (const chained of chainedEvents) {
    const { event, chainHash, sequenceNumber } = chained;

    if (event.previousHash !== expectedPreviousHash) {
      return err(
        new ChainIntegrityError(
          sequenceNumber,
          `Chain broken at sequence ${sequenceNumber}: expected previousHash ${expectedPreviousHash}, got ${event.previousHash ?? "undefined"}`,
        ),
      );
    }

    const recomputed = hashEvent(
      { ...event, previousHash: undefined, hash: undefined },
      expectedPreviousHash,
    );

    if (recomputed !== chainHash) {
      return err(
        new ChainIntegrityError(
          sequenceNumber,
          `Hash mismatch at sequence ${sequenceNumber}: stored ${chainHash}, recomputed ${recomputed}`,
        ),
      );
    }

    expectedPreviousHash = chainHash;
  }

  return ok(true);
}

export function computeChainRoot(chainedEvents: readonly ChainedEvent[]): string {
  if (chainedEvents.length === 0) return GENESIS_HASH;
  const last = chainedEvents[chainedEvents.length - 1];
  return last !== undefined ? last.chainHash : GENESIS_HASH;
}
