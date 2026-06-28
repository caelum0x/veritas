// Common dependency bundle shared across all integration flows.

import type { Clock, EventBus } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import type { AppConfig } from "@veritas/config";

/**
 * CoreDeps — the minimal set of infrastructure dependencies injected into
 * every flow and integration service in the Veritas platform.
 *
 * All fields are required; individual flows may extend this type with
 * additional domain-specific ports.
 */
export interface CoreDeps {
  /** Structured logger bound to the current service / flow context. */
  readonly logger: Logger;
  /** Monotonic / wall-clock abstraction for testable time operations. */
  readonly clock: Clock;
  /** In-process domain event bus for publishing/subscribing to events. */
  readonly eventBus: EventBus;
  /** Fully-validated platform configuration loaded at startup. */
  readonly config: AppConfig;
}

/**
 * Extend CoreDeps with additional ports specific to a flow or service.
 *
 * @example
 * type MyFlowDeps = WithDeps<CoreDeps, { repo: ClaimRepository }>;
 */
export type WithDeps<Base extends CoreDeps, Extra extends object> = Base & Extra;
