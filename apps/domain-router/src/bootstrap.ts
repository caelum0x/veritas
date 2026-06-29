// Bootstrap: wire together the registry, config, and context for the domain-router.
import { makeVerifierContext } from "@veritas/verifier-kit";
import type { VerifierContext } from "@veritas/verifier-kit";
import type { VerifierLLM } from "@veritas/llm";
import type { Clock } from "@veritas/core";
import { DomainRouterConfigSchema, type DomainRouterConfig, defaultConfig } from "./config.js";
import { VerifierRegistry } from "./registry.js";

export interface DomainRouterDeps {
  readonly llm: VerifierLLM;
  readonly clock: Clock;
  readonly sources?: ReadonlyMap<string, import("@veritas/verifier-kit").DataSourcePort>;
  readonly config?: Partial<DomainRouterConfig>;
}

export interface DomainRouterWiring {
  readonly registry: VerifierRegistry;
  readonly ctx: VerifierContext;
  readonly config: DomainRouterConfig;
}

/** Create a ready-to-use domain router wiring from external dependencies. */
export function bootstrap(deps: DomainRouterDeps): DomainRouterWiring {
  const config = DomainRouterConfigSchema.parse({ ...defaultConfig, ...deps.config });
  const sources = deps.sources ?? new Map();
  const ctx = makeVerifierContext(deps.llm, sources, deps.clock);
  const registry = new VerifierRegistry();
  return { registry, ctx, config };
}
