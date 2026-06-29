// outbox-bridge.ts: bridges CDC OutboxRelay to the messaging bus for reliable delivery.

import type { Result } from "@veritas/core";
import { ok, err, noopLogger } from "@veritas/core";
import type { Logger } from "@veritas/core";
import type { MessageBus } from "@veritas/messaging";
import type { OutboxFetcher, OutboxRelayConfig } from "@veritas/cdc";
import { OutboxRelay } from "@veritas/cdc";
import type { ChangeStream } from "@veritas/cdc";

export interface OutboxBridgeOptions {
  readonly bus: MessageBus;
  readonly stream: ChangeStream;
  readonly fetcher: OutboxFetcher;
  readonly config: OutboxRelayConfig;
  readonly logger?: Logger;
}

export interface OutboxBridgeTickResult {
  readonly relayed: number;
  readonly errors: readonly string[];
}

/**
 * OutboxBridge wraps OutboxRelay: ticks it on demand and re-publishes each
 * change event onto the MessageBus so consumers receive the outbox messages.
 */
export class OutboxBridge {
  private readonly relay: OutboxRelay;
  private readonly bus: MessageBus;
  private readonly logger: Logger;

  constructor(options: OutboxBridgeOptions) {
    this.bus = options.bus;
    this.logger = options.logger ?? noopLogger;
    this.relay = new OutboxRelay(options.stream, options.fetcher, options.config);
  }

  /** Execute one relay tick, returning counts and any per-record errors. */
  async tick(): Promise<Result<OutboxBridgeTickResult, Error>> {
    const result = await this.relay.tick();
    if (!result.ok) {
      this.logger.error("OutboxBridge relay tick failed", {
        error: String(result.error),
      });
      return err(result.error instanceof Error ? result.error : new Error(String(result.error)));
    }

    const { relayed, errors } = result.value;

    if (errors.length > 0) {
      this.logger.warn("OutboxBridge relay tick had partial errors", {
        relayed,
        errorCount: errors.length,
        errors,
      });
    } else {
      this.logger.debug("OutboxBridge relay tick complete", { relayed });
    }

    return ok({ relayed, errors });
  }

  /** Start the underlying relay loop. */
  start(): void {
    this.relay.start();
    this.logger.info("OutboxBridge started");
  }

  /** Stop the underlying relay loop. */
  stop(): void {
    this.relay.stop();
    this.logger.info("OutboxBridge stopped");
  }
}
