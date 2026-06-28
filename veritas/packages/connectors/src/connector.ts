// Connector port: interface all outbound integration connectors must implement.
import type { Result } from "@veritas/core";
import type { OutboundPayload } from "./payload.js";

export type ConnectorId = string;

export interface ConnectorMeta {
  readonly id: ConnectorId;
  readonly name: string;
  readonly version: string;
}

export interface Connector {
  readonly meta: ConnectorMeta;
  /** Send a payload to the external system; returns ok(void) or err(AppError). */
  send(payload: OutboundPayload): Promise<Result<void>>;
  /** Optional teardown; called when connector is removed from registry. */
  destroy?(): Promise<void>;
}
