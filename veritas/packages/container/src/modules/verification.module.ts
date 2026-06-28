// Registers the verification engine, LLM providers, and pipeline dependencies into the DI container.

import type { Container } from "../container.js";
import {
  LOGGER,
  LLM_REGISTRY,
  LLM_PROVIDER,
  ENGINE_OPTIONS,
  VERIFICATION_CONFIG,
} from "../tokens.js";
import { FallbackProvider, MockProvider, ProviderRegistry } from "@veritas/llm";
import type { VerifierLLM } from "@veritas/llm";
import type { EngineOptions } from "@veritas/verification";
import { noopLogger } from "@veritas/core";
import type { Logger } from "@veritas/core";

/** Default concurrency for claim research + adjudication phases. */
const DEFAULT_CONCURRENCY = 4;

/**
 * Wire the verification engine and LLM provider bindings.
 * Reads optional tuning overrides from TOKENS.VerificationConfig when present.
 */
export function registerVerificationModule(container: Container): void {
  // Shared provider registry — consumers may register additional providers at runtime.
  container.singleton(LLM_REGISTRY, (): ProviderRegistry => {
    const registry = new ProviderRegistry();
    // MockProvider is always available as a safe fallback in dev/test.
    registry.register(new MockProvider(), false, true);
    return registry;
  });

  // Resolved primary VerifierLLM — falls back to FallbackProvider wrapping mock.
  container.singleton(LLM_PROVIDER, (c): VerifierLLM => {
    const registry = c.resolve<ProviderRegistry>(LLM_REGISTRY);
    const result = registry.select({});
    if (result.ok) {
      return result.value;
    }
    return new FallbackProvider([new MockProvider()], "default-fallback");
  });

  // Assembled EngineOptions used by runVerification() everywhere in the platform.
  container.singleton(ENGINE_OPTIONS, (c): EngineOptions => {
    const llm = c.resolve<VerifierLLM>(LLM_PROVIDER);
    const logger = c.tryResolve<Logger>(LOGGER) ?? noopLogger;

    let concurrency: number = DEFAULT_CONCURRENCY;
    let maxClaims: number | undefined;
    let effort: "low" | "standard" | "high" = "standard";
    let verifier = "veritas";
    let verifierVersion = "1.0.0";

    const cfg = c.tryResolve<Record<string, unknown>>(VERIFICATION_CONFIG);
    if (cfg !== undefined) {
      if (typeof cfg["concurrency"] === "number") concurrency = cfg["concurrency"];
      if (typeof cfg["maxClaims"] === "number") maxClaims = cfg["maxClaims"];
      if (typeof cfg["verifier"] === "string") verifier = cfg["verifier"];
      if (typeof cfg["verifierVersion"] === "string") verifierVersion = cfg["verifierVersion"];
      if (cfg["effort"] === "low" || cfg["effort"] === "standard" || cfg["effort"] === "high") {
        effort = cfg["effort"];
      }
    }

    return {
      llm,
      logger,
      concurrency,
      maxClaims,
      effort,
      verifier,
      verifierVersion,
    };
  });
}
