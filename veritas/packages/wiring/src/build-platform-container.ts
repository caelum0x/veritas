// Build a fully-wired DI container by composing repositories, services, providers, and flows.

import { loadConfig } from "@veritas/config";
import type { AppConfig } from "@veritas/config";
import { createLogger } from "@veritas/observability";
import { MetricsRegistry } from "@veritas/observability";
import {
  Container,
  CONFIG,
  LOGGER,
  METRICS,
} from "@veritas/container";
import { registerRepositories } from "./register-repositories.js";
import { registerServices } from "./register-services.js";
import { registerProviders } from "./register-providers.js";
import { registerFlows } from "./register-flows.js";

export interface PlatformContainerOptions {
  /** Pre-loaded config; when omitted, loadConfig() is called to read from env. */
  readonly config?: AppConfig;
  /** Skip registering the verification + CAP providers (useful for lightweight builds). */
  readonly skipProviders?: boolean;
  /** Skip flow dep-bundle registration (saves tokens in edge/worker contexts). */
  readonly skipFlows?: boolean;
}

/**
 * Build and return a fully-wired platform Container.
 * All bindings are lazy singletons — nothing is instantiated until first resolved.
 */
export function buildPlatformContainer(opts: PlatformContainerOptions = {}): Container {
  const config = opts.config ?? loadConfig();
  const c = new Container();

  // ── Foundation ─────────────────────────────────────────────────────────────
  c.value(CONFIG, config);

  c.singleton(LOGGER, () => {
    // createLogger returns Logger from @veritas/observability which satisfies
    // the Logger interface expected by the container token.
    const logger = createLogger({
      level: config.observability.logLevel ?? "info",
      bindings: { service: "veritas-platform" },
    });
    // Cast needed because @veritas/core Logger and @veritas/observability Logger
    // are structurally identical but declared in separate modules.
    return logger as unknown as import("@veritas/core").Logger;
  });

  c.singleton(METRICS, () => new MetricsRegistry());

  // ── Persistence layer ──────────────────────────────────────────────────────
  registerRepositories(c);

  // ── Application services ───────────────────────────────────────────────────
  registerServices(c);

  // ── LLM + verification + CAP providers ────────────────────────────────────
  if (!opts.skipProviders) {
    registerProviders(c);
  }

  // ── Flow dependency bundles ────────────────────────────────────────────────
  if (!opts.skipFlows) {
    registerFlows(c);
  }

  return c;
}
