// Wire all services, repositories, and providers into a fully-configured Container.

import { loadConfig } from "@veritas/config";
import type { AppConfig } from "@veritas/config";
import { createLogger } from "@veritas/observability";
import { MetricsRegistry } from "@veritas/observability";
import { Container } from "./container.js";
import { CONFIG, LOGGER, METRICS } from "./tokens.js";
import { registerPersistence } from "./modules/persistence.module.js";
import { registerServices } from "./modules/services.module.js";
import { registerVerificationQualityModule } from "./modules/verification-quality.module.js";
import { registerDomainVerifiersModule } from "./modules/domain-verifiers.module.js";
import { registerFactGraphModule } from "./modules/fact-graph.module.js";
import { registerVerificationModule } from "./modules/verification.module.js";

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

  // ── Verification quality seams (guardrails + calibration + citations) ────────
  // Registered before the verification module so ENGINE_OPTIONS can pick them up.
  registerVerificationQualityModule(c);

  // ── Domain verifiers (specialized, real-source-backed) ───────────────────────
  registerDomainVerifiersModule(c);

  // ── Evidence graph (projects verification reports into a fact graph) ─────────
  registerFactGraphModule(c);

  // ── Verification engine (assembles ENGINE_OPTIONS) ───────────────────────────
  registerVerificationModule(c);

  // ── Persistence layer ────────────────────────────────────────────────────────
  registerPersistence(c);

  // ── Application services ────────────────────────────────────────────────────
  registerServices(c);

  return c;
}
