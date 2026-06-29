// Rule engine: apply an ordered list of pricing rules to a running price.

import { type Result, ok, err } from "@veritas/core";
import { type PriceMoney } from "./types.js";
import { type PricingContext } from "./types.js";
import { RuleEngineError } from "./errors.js";
import { addMoney, clampToZero } from "./currency.js";

/** A single pricing rule that may modify the running price. */
export interface PricingRule {
  /** Unique name used in error messages and audit logs. */
  readonly name: string;
  /** Rules with lower priority run first. */
  readonly priority: number;
  /** Whether this rule modifies the subtotal directly or returns a delta. */
  readonly kind: "REPLACE" | "DELTA";
  /**
   * Evaluate the rule against context and the current running price.
   * Return the new price (REPLACE) or a signed delta to add (DELTA).
   */
  apply(ctx: PricingContext, current: PriceMoney): Promise<PriceMoney>;
}

/** Result of running the full rule engine pass. */
export interface RuleEngineResult {
  readonly finalPrice: PriceMoney;
  /** Names of rules that were executed, in order. */
  readonly appliedRules: readonly string[];
}

/**
 * Run all rules in ascending priority order.
 * REPLACE rules set the price; DELTA rules add a signed adjustment.
 * Returns an error if any rule throws.
 */
export async function applyRules(
  rules: readonly PricingRule[],
  ctx: PricingContext,
  basePrice: PriceMoney,
): Promise<Result<RuleEngineResult, RuleEngineError>> {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  let current = basePrice;
  const appliedRules: string[] = [];

  for (const rule of sorted) {
    try {
      const result = await rule.apply(ctx, current);
      if (rule.kind === "REPLACE") {
        current = result;
      } else {
        current = clampToZero(addMoney(current, result));
      }
      appliedRules.push(rule.name);
    } catch (cause) {
      return err(new RuleEngineError(rule.name, cause));
    }
  }

  return ok({ finalPrice: current, appliedRules });
}

/** Build a no-op passthrough rule (useful as a placeholder). */
export function noopRule(name: string, priority: number): PricingRule {
  return {
    name,
    priority,
    kind: "REPLACE",
    async apply(_ctx, current) {
      return current;
    },
  };
}
