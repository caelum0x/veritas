// registry.ts: maintains the set of registered bridges and coordinates lifecycle.

import { ok, err, type Result, type Logger, noopLogger } from "@veritas/core";
import type { Bridge, RegistrySnapshot } from "./types.js";
import { RegistryError } from "./errors.js";

/** Holds all bridges and manages their collective start/stop lifecycle. */
export class WiringRegistry {
  private readonly bridges = new Map<string, Bridge>();
  private readonly logger: Logger;
  private started = false;

  constructor(logger?: Logger) {
    this.logger = logger ?? noopLogger;
  }

  register(bridge: Bridge): void {
    if (this.started) {
      throw new RegistryError(
        `Cannot register bridge "${bridge.name}" after registry has started`,
      );
    }
    if (this.bridges.has(bridge.name)) {
      throw new RegistryError(`Bridge "${bridge.name}" is already registered`);
    }
    this.bridges.set(bridge.name, bridge);
    this.logger.debug("Bridge registered", { bridge: bridge.name });
  }

  async startAll(): Promise<Result<void, RegistryError>> {
    if (this.started) {
      return err(new RegistryError("Registry is already started"));
    }

    const failures: string[] = [];

    for (const [name, bridge] of this.bridges) {
      this.logger.info("Starting bridge", { bridge: name });
      const result = await bridge.start();
      if (!result.ok) {
        this.logger.error("Bridge failed to start", {
          bridge: name,
          error: result.error.message,
        });
        failures.push(name);
      }
    }

    if (failures.length > 0) {
      return err(
        new RegistryError(
          `The following bridges failed to start: ${failures.join(", ")}`,
        ),
      );
    }

    this.started = true;
    this.logger.info("All bridges started", { count: this.bridges.size });
    return ok(undefined);
  }

  async stopAll(): Promise<void> {
    for (const [name, bridge] of this.bridges) {
      this.logger.info("Stopping bridge", { bridge: name });
      await bridge.stop().catch((error: unknown) => {
        this.logger.error("Bridge failed to stop cleanly", {
          bridge: name,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
    this.started = false;
    this.logger.info("All bridges stopped");
  }

  snapshot(): RegistrySnapshot {
    return {
      bridges: [...this.bridges.keys()],
      started: this.started,
    };
  }

  isStarted(): boolean {
    return this.started;
  }
}
