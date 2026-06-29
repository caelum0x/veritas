// Audit logger interface and console/in-memory implementations for compliance trails.
import { newId, epochToIso } from "@veritas/core";
import type { AuditEvent, AuditActor, AuditOutcome } from "./audit-event.js";

/** Parameters required to emit a single audit entry. */
export interface AuditEntry {
  readonly action: string;
  readonly actor: AuditActor;
  readonly outcome: AuditOutcome;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly statusCode?: number;
  readonly message?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly correlationId?: string;
}

/** Interface for audit loggers — all implementations must be non-throwing. */
export interface AuditLogger {
  /** Record an auditable event. Never throws; errors are swallowed internally. */
  log(entry: AuditEntry): void;
  /** Async variant for implementations that persist to a remote store. */
  logAsync(entry: AuditEntry): Promise<void>;
}

/** Build a fully-qualified AuditEvent from a partial entry. */
function toAuditEvent(entry: AuditEntry): AuditEvent {
  return {
    id: newId("audit"),
    occurredAt: epochToIso(Date.now()),
    action: entry.action,
    actor: entry.actor,
    outcome: entry.outcome,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    statusCode: entry.statusCode,
    message: entry.message,
    metadata: entry.metadata,
    correlationId: entry.correlationId,
  };
}

/** Console-based audit logger — serialises each event to stdout as JSON. */
export class ConsoleAuditLogger implements AuditLogger {
  log(entry: AuditEntry): void {
    try {
      const event = toAuditEvent(entry);
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ audit: true, ...event }));
    } catch {
      // intentionally swallowed
    }
  }

  async logAsync(entry: AuditEntry): Promise<void> {
    this.log(entry);
  }
}

/** In-memory audit logger — stores events for retrieval in tests or local dev. */
export class InMemoryAuditLogger implements AuditLogger {
  private readonly _events: AuditEvent[] = [];

  log(entry: AuditEntry): void {
    try {
      this._events.push(toAuditEvent(entry));
    } catch {
      // intentionally swallowed
    }
  }

  async logAsync(entry: AuditEntry): Promise<void> {
    this.log(entry);
  }

  /** Return a read-only snapshot of all recorded events. */
  events(): readonly AuditEvent[] {
    return [...this._events];
  }

  /** Clear all recorded events. */
  clear(): void {
    this._events.length = 0;
  }
}

/** Default no-op audit logger for contexts where auditing is explicitly disabled. */
export class NoopAuditLogger implements AuditLogger {
  log(_entry: AuditEntry): void {
    // intentionally silent
  }

  async logAsync(_entry: AuditEntry): Promise<void> {
    // intentionally silent
  }
}

/** Shared no-op instance. */
export const noopAuditLogger: AuditLogger = new NoopAuditLogger();
