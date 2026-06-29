// Evaluator: runs all policies against current signals and picks the most aggressive decision
import { Result, ok, err } from "@veritas/core";
import { ScalingPolicy, ScalingSignal } from "./types.js";
import { ScaleDecision, makeScaleDecision, noopDecision } from "./decision.js";
import { CapacityLimits, clampCapacity } from "./limits.js";
import { CooldownTracker } from "./cooldown.js";
import { EvaluatorError, CooldownActiveError } from "./errors.js";

export interface EvaluatorOptions {
  readonly policies: ReadonlyArray<ScalingPolicy>;
  readonly limits: CapacityLimits;
  readonly cooldown: CooldownTracker;
}

export interface Evaluator {
  evaluate(
    signals: ReadonlyArray<ScalingSignal>,
    currentCapacity: number,
    nowMs?: number
  ): Result<ScaleDecision, EvaluatorError | CooldownActiveError>;
}

export function makeEvaluator(opts: EvaluatorOptions): Evaluator {
  const { policies, limits, cooldown } = opts;

  return {
    evaluate(
      signals: ReadonlyArray<ScalingSignal>,
      currentCapacity: number,
      nowMs: number = Date.now()
    ): Result<ScaleDecision, EvaluatorError | CooldownActiveError> {
      const ts = new Date(nowMs).toISOString();

      const cooldownCheck = cooldown.check(nowMs);
      if (!cooldownCheck.allowed) {
        return err(
          new CooldownActiveError(
            new Date(cooldownCheck.endsAtMs ?? nowMs).toISOString()
          )
        );
      }

      if (policies.length === 0) {
        return ok(noopDecision(currentCapacity, "No policies configured", ts));
      }

      let bestDesired = currentCapacity;
      let bestReason = "No policy triggered";
      let bestPolicy: string | undefined;

      for (const policy of policies) {
        try {
          const result = policy.evaluate(signals, currentCapacity, nowMs);
          if (result.desired === currentCapacity) continue;

          const isScaleUp = result.desired > currentCapacity;
          const isBetter = isScaleUp
            ? result.desired > bestDesired
            : result.desired < bestDesired;

          if (isBetter || bestDesired === currentCapacity) {
            bestDesired = result.desired;
            bestReason = result.reason;
            bestPolicy = policy.name;
          }
        } catch (e) {
          return err(
            new EvaluatorError(
              `Policy "${policy.name}" threw during evaluation`,
              e
            )
          );
        }
      }

      const clamped = clampCapacity(bestDesired, limits);
      if (!clamped.ok) {
        return err(new EvaluatorError("Capacity clamping failed", clamped.error));
      }

      const decision = makeScaleDecision(
        currentCapacity,
        clamped.value,
        bestReason,
        { triggeredByPolicy: bestPolicy, timestamp: ts }
      );

      if (decision.direction !== "NONE") {
        cooldown.arm(nowMs);
      }

      return ok(decision);
    },
  };
}
