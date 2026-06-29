// pipeline: run a sequence of QualityGates and collect results, stopping on critical failure.

import { ok, err, isErr } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { QualityGate, GateInput } from "./gate.js";
import type { GateResult } from "./result.js";
import { atLeast } from "./severity.js";

export interface PipelineOutcome {
  readonly passed: boolean;
  readonly results: readonly GateResult[];
}

/**
 * Run gates sequentially; short-circuits when a gate produces a finding at or
 * above its own `failOn` severity level and `abortOnFirstFailure` is true.
 */
export async function runPipeline(
  gates: readonly QualityGate[],
  input: GateInput,
  options: { abortOnFirstFailure?: boolean } = {},
): Promise<Result<PipelineOutcome>> {
  const results: GateResult[] = [];
  let overallPassed = true;

  for (const gate of gates) {
    const resultR = await gate.evaluate(input);
    if (isErr(resultR)) {
      return err(resultR.error);
    }

    const gateResult = resultR.value;
    results.push(gateResult);

    if (!gateResult.passed) {
      const triggersFailure = gateResult.findings.some((f) =>
        atLeast(f.severity, gate.failOn),
      );
      if (triggersFailure) {
        overallPassed = false;
        if (options.abortOnFirstFailure) {
          break;
        }
      }
    }
  }

  return ok({ passed: overallPassed, results });
}
