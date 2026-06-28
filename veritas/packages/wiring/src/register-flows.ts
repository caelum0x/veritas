// Register flow factory tokens — each factory produces a bound flow runner from resolved deps.

import { InMemoryEventBus } from "@veritas/core";
import type { EventBus } from "@veritas/core";
import {
  Container,
  LOGGER,
  LLM_PROVIDER,
  ENGINE_OPTIONS,
} from "@veritas/container";
import type { VerifyClaimsDeps } from "@veritas/flows-verification";
import type { VerificationFlowDeps } from "@veritas/flows-verification";
import type { EngineOptions } from "@veritas/verification";

/** Local token type — Container uses symbol-based tokens. */
type FlowToken<_T> = symbol;

/** Local token helper — keeps wiring tokens self-contained. */
function flowToken<T>(name: string): FlowToken<T> {
  return Symbol(name);
}

// ── Shared event bus token ─────────────────────────────────────────────────────

/** DI token for the platform-wide in-memory event bus. */
export const EVENT_BUS_TOKEN = flowToken<EventBus>("EventBus");

// ── Verification flow dep-bundle token ────────────────────────────────────────

/** DI token for the core VerificationFlowDeps bundle used across verification flows. */
export const VERIFICATION_FLOW_DEPS_TOKEN = flowToken<VerificationFlowDeps>("VerificationFlowDeps");

/** DI token for the VerifyClaimsDeps bundle used by verifyClaimsFlow. */
export const VERIFY_CLAIMS_DEPS_TOKEN = flowToken<VerifyClaimsDeps>("VerifyClaimsDeps");

/**
 * Register flow-level dependency bundles (not the flows themselves).
 * Flows are pure functions — they are invoked at call sites with resolved deps,
 * not registered as singleton instances. This module ensures the shared dep bundles
 * (event bus, LLM, logger) are available for consumers to compose flows.
 */
export function registerFlows(c: Container): void {
  // Platform-wide event bus — shared by all flows for domain event publication.
  if (!c.has(EVENT_BUS_TOKEN)) {
    c.singleton<EventBus>(EVENT_BUS_TOKEN, (): EventBus => new InMemoryEventBus());
  }

  // Verification flow dependency bundle — pre-composed for convenience.
  c.singleton<VerificationFlowDeps>(VERIFICATION_FLOW_DEPS_TOKEN, (ctr): VerificationFlowDeps => ({
    llm: ctr.resolve<VerificationFlowDeps["llm"]>(LLM_PROVIDER),
    engineOptions: ctr.tryResolve<Partial<EngineOptions>>(ENGINE_OPTIONS) ?? undefined,
    eventBus: ctr.resolve<EventBus>(EVENT_BUS_TOKEN),
    logger: ctr.resolve<VerificationFlowDeps["logger"]>(LOGGER),
  }));

  // VerifyClaimsDeps — flat deps shape used directly by verifyClaimsFlow.
  c.singleton<VerifyClaimsDeps>(VERIFY_CLAIMS_DEPS_TOKEN, (ctr): VerifyClaimsDeps => {
    const engineOptions = ctr.tryResolve<EngineOptions>(ENGINE_OPTIONS);
    return {
      llm: ctr.resolve<VerifyClaimsDeps["llm"]>(LLM_PROVIDER),
      eventBus: ctr.resolve<EventBus>(EVENT_BUS_TOKEN),
      logger: ctr.resolve<VerifyClaimsDeps["logger"]>(LOGGER),
      concurrency: engineOptions?.concurrency,
      maxClaims: engineOptions?.maxClaims,
      verifier: engineOptions?.verifier,
      verifierVersion: engineOptions?.verifierVersion,
      effort: engineOptions?.effort,
    };
  });
}
