// Registers the verification engine, LLM providers, and pipeline dependencies into the DI container.

import type { Container } from "../container.js";
import {
  CONFIG,
  LOGGER,
  LLM_REGISTRY,
  LLM_PROVIDER,
  ENGINE_OPTIONS,
  VERIFICATION_CONFIG,
  INPUT_GUARD,
  CONFIDENCE_CALIBRATOR,
  CITATION_REFINER,
  DOMAIN_VERIFIER_ROUTER,
} from "../tokens.js";
import { AnthropicProvider, FallbackProvider, MockProvider, ProviderRegistry } from "@veritas/llm";
import type { VerifierLLM } from "@veritas/llm";
import type { AppConfig } from "@veritas/config";
import type {
  EngineOptions,
  InputGuard,
  ConfidenceCalibrator,
  CitationRefiner,
  DomainVerifierRouter,
} from "@veritas/verification";
import { noopLogger } from "@veritas/core";
import type { Logger } from "@veritas/core";

/** Default concurrency for claim research + adjudication phases. */
const DEFAULT_CONCURRENCY = 4;

/**
 * Wire the verification engine and LLM provider bindings.
 * Reads optional tuning overrides from TOKENS.VerificationConfig when present.
 */
export function registerVerificationModule(container: Container): void {
  // Shared provider registry. The real Anthropic provider is the default when an
  // API key is configured; MockProvider is registered only as an explicit
  // non-default fallback for unconfigured (dev/test) environments.
  container.singleton(LLM_REGISTRY, (c): ProviderRegistry => {
    const registry = new ProviderRegistry();
    const config = c.tryResolve<AppConfig>(CONFIG);
    const apiKey = config?.anthropic?.apiKey;

    if (apiKey && config) {
      // supportsWebSearch=true (Claude web_search), isDefault=true (production brain).
      registry.register(new AnthropicProvider(config.anthropic), true, true);
      c.tryResolve<Logger>(LOGGER)?.info("llm: AnthropicProvider registered as default");
    } else {
      c.tryResolve<Logger>(LOGGER)?.warn(
        "llm: ANTHROPIC_API_KEY not configured — falling back to MockProvider (non-production)",
      );
    }

    // Mock is the default only when no real provider is available.
    registry.register(new MockProvider(), false, !apiKey);
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

    // Optional verification-quality seams: present only when the
    // verification-quality module has been registered. Backward-compatible.
    const inputGuard = c.tryResolve<InputGuard>(INPUT_GUARD);
    const calibrator = c.tryResolve<ConfidenceCalibrator>(CONFIDENCE_CALIBRATOR);
    const citationRefiner = c.tryResolve<CitationRefiner>(CITATION_REFINER);
    const domainRouter = c.tryResolve<DomainVerifierRouter>(DOMAIN_VERIFIER_ROUTER);

    return {
      llm,
      logger,
      concurrency,
      maxClaims,
      effort,
      verifier,
      verifierVersion,
      ...(inputGuard !== undefined ? { inputGuard } : {}),
      ...(calibrator !== undefined ? { calibrator } : {}),
      ...(citationRefiner !== undefined ? { citationRefiner } : {}),
      ...(domainRouter !== undefined ? { domainRouter } : {}),
    };
  });
}
