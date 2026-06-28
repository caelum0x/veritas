// SIEM adapter port — models integration with external Security Information and Event Management systems.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { AuditEvent, SiemConfig } from "./types.js";
import { toCef } from "./cef.js";

/** Port interface for forwarding audit events to a SIEM platform. */
export interface SiemAdapter {
  /** Send a single audit event to the SIEM. */
  send(event: AuditEvent): Promise<Result<void>>;
  /** Send a batch of events; stops on first unrecoverable error. */
  sendBatch(events: readonly AuditEvent[]): Promise<Result<number>>;
}

/** Mock SIEM adapter that records forwarded events without a real network call. */
export class MockSiemAdapter implements SiemAdapter {
  private readonly _sent: AuditEvent[] = [];

  async send(event: AuditEvent): Promise<Result<void>> {
    this._sent.push(event);
    return ok(undefined);
  }

  async sendBatch(events: readonly AuditEvent[]): Promise<Result<number>> {
    for (const e of events) {
      this._sent.push(e);
    }
    return ok(events.length);
  }

  /** Return a snapshot of all events that have been forwarded. */
  sent(): readonly AuditEvent[] {
    return [...this._sent];
  }

  /** Reset recorded events. */
  clear(): void {
    this._sent.length = 0;
  }
}

/** HTTP-based SIEM adapter that POSTs CEF-formatted events to a collector endpoint. */
export class HttpSiemAdapter implements SiemAdapter {
  constructor(private readonly config: SiemConfig) {}

  async send(event: AuditEvent): Promise<Result<void>> {
    try {
      const body = toCef(event);
      const res = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body,
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 5000),
      });
      if (!res.ok) {
        return err(new Error(`SIEM responded with HTTP ${res.status}`));
      }
      return ok(undefined);
    } catch (e) {
      return err(e);
    }
  }

  async sendBatch(events: readonly AuditEvent[]): Promise<Result<number>> {
    let sent = 0;
    for (const event of events) {
      const result = await this.send(event);
      if (result.ok) {
        sent++;
      } else {
        return err((result as { ok: false; error: unknown }).error);
      }
    }
    return ok(sent);
  }
}
