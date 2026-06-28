// Wire all services, repositories, and providers into a fully-configured Container.

import { loadConfig } from "@veritas/config";
import type { AppConfig } from "@veritas/config";
import { createLogger } from "@veritas/observability";
import { MetricsRegistry } from "@veritas/observability";
import { MockProvider } from "@veritas/llm";
import { Container } from "./container.js";
import { CONFIG, LOGGER, METRICS, LLM_PROVIDER } from "./tokens.js";
import { registerPersistence } from "./modules/persistence.module.js";
import { registerServices } from "./modules/services.module.js";

export interface BuildContainerOptions {
  /** Pre-loaded config; if omitted, loadConfig() is called. */
  readonly config?: AppConfig;
}

/**
 * Construct and return a fully-wired Container.
 * All bindings are lazy singletons — nothing is instantiated until resolved.
 */
export function buildContainer(opts: BuildContainerOptions = {}): Container {
  const config = opts.config ?? loadConfig();
  const c = new Container();

  // ── Foundation ──────────────────────────────────────────────────────────────
  c.value(CONFIG, config);

  c.singleton(LOGGER, () =>
    createLogger({
      level: config.observability.logLevel ?? "info",
      bindings: { service: "veritas" },
    }),
  );

  c.singleton(METRICS, () => new MetricsRegistry());

  // ── LLM provider ────────────────────────────────────────────────────────────
  // Default to MockProvider in non-production; real deployments override after build.
  c.singleton(LLM_PROVIDER, () => new MockProvider());

  // ── Persistence layer ────────────────────────────────────────────────────────
  registerPersistence(c);

  // ── Application services ────────────────────────────────────────────────────
  registerServices(c);

  return c;
}
