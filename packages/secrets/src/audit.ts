// Audit trail for secret access and mutation events — port interface with in-memory mock.

import { newId } from "@veritas/core";

/** Categories of secret lifecycle events to record. */
export type SecretAuditEventType =
  | "read"
  | "write"
  | "delete"
  | "rotate"
  | "resolve"
  | "cache_hit"
  | "cache_miss";

/** Immutable record of a single auditable secret operation. */
export interface SecretAuditEvent {
  readonly id: string;
  readonly secretName: string;
  readonly eventType: SecretAuditEventType;
  readonly actor: string;
  readonly timestamp: string;
  readonly version?: string;
  readonly success: boolean;
  readonly errorMessage?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Port interface for persisting and querying secret audit events. */
export interface SecretAuditLog {
  record(event: Omit<SecretAuditEvent, "id" | "timestamp">): Promise<void>;
  query(filter: SecretAuditFilter): Promise<ReadonlyArray<SecretAuditEvent>>;
}

export interface SecretAuditFilter {
  readonly secretName?: string;
  readonly actor?: string;
  readonly eventType?: SecretAuditEventType;
  readonly since?: string; // ISO-8601
  readonly until?: string; // ISO-8601
  readonly limit?: number;
}

/** In-memory SecretAuditLog for development, testing, and local usage. */
export class InMemorySecretAuditLog implements SecretAuditLog {
  private readonly events: SecretAuditEvent[] = [];

  async record(
    event: Omit<SecretAuditEvent, "id" | "timestamp">
  ): Promise<void> {
    this.events.push({
      ...event,
      id: newId("sevt"),
      timestamp: new Date().toISOString(),
    });
  }

  async query(filter: SecretAuditFilter): Promise<ReadonlyArray<SecretAuditEvent>> {
    let results = this.events as SecretAuditEvent[];

    if (filter.secretName !== undefined) {
      results = results.filter((e) => e.secretName === filter.secretName);
    }
    if (filter.actor !== undefined) {
      results = results.filter((e) => e.actor === filter.actor);
    }
    if (filter.eventType !== undefined) {
      results = results.filter((e) => e.eventType === filter.eventType);
    }
    if (filter.since !== undefined) {
      const since = new Date(filter.since).getTime();
      results = results.filter((e) => new Date(e.timestamp).getTime() >= since);
    }
    if (filter.until !== undefined) {
      const until = new Date(filter.until).getTime();
      results = results.filter((e) => new Date(e.timestamp).getTime() <= until);
    }

    const limit = filter.limit ?? results.length;
    return results.slice(-limit);
  }

  /** Returns total number of recorded events. */
  get count(): number {
    return this.events.length;
  }

  /** Clears all recorded events (useful in tests). */
  clear(): void {
    this.events.length = 0;
  }
}

/** Factory helper to build a SecretAuditEvent payload without id/timestamp. */
export function buildAuditEvent(
  secretName: string,
  eventType: SecretAuditEventType,
  actor: string,
  success: boolean,
  opts?: {
    version?: string;
    errorMessage?: string;
    details?: Record<string, unknown>;
  }
): Omit<SecretAuditEvent, "id" | "timestamp"> {
  return {
    secretName,
    eventType,
    actor,
    success,
    version: opts?.version,
    errorMessage: opts?.errorMessage,
    details: opts?.details,
  };
}
