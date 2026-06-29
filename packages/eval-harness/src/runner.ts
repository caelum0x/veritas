// Eval runner: executes a verifier function over a dataset and collects scored results.
import { newId, ok, err, tryAsync } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import type { EvalDataset } from "./dataset.js";
import type { EvalCase } from "./case.js";
import type { Metric, MetricContext } from "./metric.js";
import { scoreAll, summarizeAll } from "./metric.js";
import type { RunResult, CaseMetricScore } from "./types.js";
import { CaseExecutionError } from "./errors.js";

/** A function that runs verification and returns a VerificationReport. */
export type VerifierFn = (inputText: string) => Promise<VerificationReport>;

/** Options for a single eval run. */
export interface RunOptions {
  /** Maximum number of cases to run in parallel (default: 4). */
  readonly concurrency?: number;
  /** If set, only run cases with these ids. */
  readonly caseIds?: readonly string[];
}

/** Result of executing a single case. */
interface CaseResult {
  readonly evalCase: EvalCase;
  readonly report: VerificationReport;
}

async function executeCase(
  evalCase: EvalCase,
  verifier: VerifierFn
): Promise<Result<CaseResult, CaseExecutionError>> {
  const result = await tryAsync(() => verifier(evalCase.inputText));
  if (!result.ok) {
    return err(
      new CaseExecutionError(
        `Case ${evalCase.id} failed: ${String(result.error)}`,
        { cause: result.error }
      )
    );
  }
  return ok({ evalCase, report: result.value });
}

async function runBatch(
  cases: readonly EvalCase[],
  verifier: VerifierFn,
  concurrency: number
): Promise<readonly CaseResult[]> {
  const results: CaseResult[] = [];
  for (let i = 0; i < cases.length; i += concurrency) {
    const batch = cases.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((c) => executeCase(c, verifier))
    );
    for (const s of settled) {
      if (s.status === "fulfilled" && s.value.ok) {
        results.push(s.value.value);
      }
      // Silently skip failed cases — they show as 0 score in summaries
    }
  }
  return results;
}

/** Run all cases in a dataset through the verifier and score them. */
export async function runEval(
  dataset: EvalDataset,
  verifier: VerifierFn,
  metrics: readonly Metric[],
  options: RunOptions = {}
): Promise<RunResult> {
  const concurrency = options.concurrency ?? 4;
  const startedAt = new Date().toISOString();
  const runId = newId("run");

  const casesToRun = options.caseIds
    ? dataset.cases.filter((c) => options.caseIds!.includes(c.id))
    : dataset.cases;

  const caseResults = await runBatch(casesToRun, verifier, concurrency);

  const contexts: MetricContext[] = caseResults.map(({ evalCase, report }) => ({
    evalCase,
    report,
  }));

  const caseScores: readonly CaseMetricScore[] = scoreAll(metrics, contexts);
  const summaries = summarizeAll(caseScores);

  return {
    runId,
    datasetId: dataset.id,
    startedAt,
    completedAt: new Date().toISOString(),
    caseScores,
    summaries,
  };
}
