// ModelRouter: top-level entry point — validates policy then delegates to selector
import { err, isOk } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { RoutingTask, RoutingDecision, RoutingStrategy } from "./types.js";
import { ModelSelector } from "./selector.js";
import { RoutingPolicy } from "./policy.js";
import { CostAwareStrategy } from "./cost-aware.js";
import { QualityAwareStrategy } from "./quality-aware.js";
import { FallbackChainStrategy } from "./fallback-chain.js";
import { ModelRegistry, buildDefaultRegistry } from "./registry.js";
import type { PolicyConfig } from "./policy.js";
import type { FallbackEntry } from "./types.js";
import type { VerifierLLM } from "@veritas/llm";

/** Options for constructing a ModelRouter */
export interface ModelRouterOptions {
  /** Pre-built registry; if omitted, buildDefaultRegistry is called with primaryProvider */
  readonly registry?: ModelRegistry;
  /** Primary Anthropic provider used to seed the default registry */
  readonly primaryProvider: VerifierLLM;
  /** Override the default routing policy config */
  readonly policyConfig?: PolicyConfig;
  /** Static fallback chain appended after cost/quality strategies */
  readonly fallbackChain?: ReadonlyArray<FallbackEntry>;
}

/**
 * Top-level router that:
 *  1. Validates the task against the routing policy
 *  2. Delegates to a ModelSelector that tries cost-aware then quality-aware strategies
 *  3. Falls back to a static chain when both dynamic strategies fail
 */
export class ModelRouter {
  private readonly policy: RoutingPolicy;
  private readonly selector: ModelSelector;

  constructor(opts: ModelRouterOptions) {
    const registry = opts.registry ?? buildDefaultRegistry(opts.primaryProvider);
    this.policy = new RoutingPolicy(opts.policyConfig);

    const strategies: RoutingStrategy[] = [
      new CostAwareStrategy(registry),
      new QualityAwareStrategy(registry),
    ];

    if (opts.fallbackChain && opts.fallbackChain.length > 0) {
      strategies.push(new FallbackChainStrategy(opts.fallbackChain));
    }

    this.selector = new ModelSelector(strategies);
  }

  /** Route a task to the best available model, returning a RoutingDecision or AppError */
  route(task: RoutingTask): Result<RoutingDecision, AppError> {
    const policyResult = this.policy.validate(task);
    if (!isOk(policyResult)) return err(policyResult.error);
    return this.selector.select(policyResult.value);
  }
}
