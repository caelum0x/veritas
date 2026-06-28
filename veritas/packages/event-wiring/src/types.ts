// types.ts: shared types for the event-wiring package bridges and registry.

import type { Result, Logger } from "@veritas/core";
import type { DomainEvent } from "@veritas/core";
import type { WiringError } from "./errors.js";

/** A bridge wires one integration concern (webhooks, notifications, projections) to domain events. */
export interface Bridge {
  readonly name: string;
  /** Called once during bootstrap to attach listeners and start processing. */
  start(): Promise<Result<void, WiringError>>;
  /** Called during graceful shutdown to release resources. */
  stop(): Promise<void>;
}

/** Options common to all bridges. */
export interface BridgeOptions {
  readonly logger?: Logger;
}

/** Describes a handler registered against a specific domain event type. */
export interface EventHandlerEntry {
  readonly eventType: string;
  readonly handler: (event: DomainEvent) => Promise<void>;
}

/** Snapshot of wiring registry state. */
export interface RegistrySnapshot {
  readonly bridges: readonly string[];
  readonly started: boolean;
}
