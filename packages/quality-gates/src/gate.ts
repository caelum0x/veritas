// QualityGate interface: unit of quality enforcement run against a verification report.

import type { Result } from "@veritas/core";
import type { GateResult } from "./result.js";
import type { Severity } from "./severity.js";

/** Minimal input passed to every gate for evaluation. */
export interface GateInput {
  /** The assembled verification report (plain object, not yet persisted). */
  readonly report: unknown;
  /** Raw evidence items keyed by claim id. */
  readonly evidenceByClaimId: Readonly<Record<string, readonly unknown[]>>;
  /** Citation objects present in the report. */
  readonly citations: readonly unknown[];
  /** Source objects referenced by citations. */
  readonly sources: readonly unknown[];
  /** ISO-8601 timestamp used as "now" for freshness comparisons. */
  readonly asOf: string;
}

/** A single named quality gate. */
export interface QualityGate {
  /** Stable machine-readable identifier (e.g. "citation-coverage"). */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Minimum severity at which this gate causes the pipeline to fail. */
  readonly failOn: Severity;
  /** Evaluate the gate against the supplied input. */
  evaluate(input: GateInput): Promise<Result<GateResult>>;
}
