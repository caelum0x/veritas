// High-level flags client: resolves flags for a context with overrides + rollout
import { isOk } from "@veritas/core";
import { type FlagProvider } from "./provider.js";
import { type EvaluationContext } from "./context.js";
import { type FeatureFlag } from "./flag.js";
import { evaluate } from "./evaluator.js";
import { OverrideStore } from "./overrides.js";
import { FlagRegistry } from "./registry.js";

export interface FlagClientOptions {
  readonly provider: FlagProvider;
  readonly registry?: FlagRegistry;
  readonly overrides?: OverrideStore;
}

/** Unified client for evaluating feature flags */
export class FlagClient {
  private readonly provider: FlagProvider;
  private readonly registry: FlagRegistry;
  readonly overrides: OverrideStore;

  constructor(options: FlagClientOptions) {
    this.provider = options.provider;
    this.registry = options.registry ?? new FlagRegistry();
    this.overrides = options.overrides ?? new OverrideStore();
  }

  /** Evaluate a flag for the given context; returns false on unknown flags */
  async isEnabled(key: string, context: EvaluationContext): Promise<boolean> {
    // Tenant override takes priority
    const override = this.overrides.resolve(context, key);
    if (override !== undefined) return override;

    // Load flag definition from provider or registry fallback
    let flag: FeatureFlag | undefined = this.registry.find(key);
    if (!flag) {
      const result = await this.provider.getFlag(key);
      if (!isOk(result)) return false;
      flag = result.value;
    }
    if (!flag) return false;

    const evalResult = evaluate(flag, context);
    return evalResult.reason !== "DISABLED" && Boolean(evalResult.value);
  }

  /** Evaluate multiple flags at once; returns a record of key→enabled */
  async evaluateAll(
    context: EvaluationContext
  ): Promise<Readonly<Record<string, boolean>>> {
    const listResult = await this.provider.listFlags();
    if (!isOk(listResult)) return {};
    const flags = listResult.value;
    const entries = await Promise.all(
      flags.map(async (flag: FeatureFlag) => {
        const enabled = await this.isEnabled(flag.key, context);
        return [flag.key, enabled] as const;
      })
    );
    return Object.fromEntries(entries);
  }
}
