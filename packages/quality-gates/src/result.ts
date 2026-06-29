// GateResult: the outcome of running a single quality gate.

import type { Severity } from "./severity.js";

/** An individual finding produced by a gate. */
export interface GateFinding {
  readonly code: string;
  readonly message: string;
  readonly severity: Severity;
  /** Optional path into the report document (dot-notation). */
  readonly path?: string;
}

/** Outcome of a single gate evaluation. */
export interface GateResult {
  readonly gateId: string;
  readonly passed: boolean;
  readonly findings: readonly GateFinding[];
  /** Optional numeric metric emitted by the gate (e.g. coverage ratio). */
  readonly metric?: number;
}

/** Construct a passing GateResult with no findings. */
export function passed(gateId: string, metric?: number): GateResult {
  return { gateId, passed: true, findings: [], metric };
}

/** Construct a failing GateResult from one or more findings. */
export function failed(
  gateId: string,
  findings: readonly GateFinding[],
  metric?: number,
): GateResult {
  return { gateId, passed: false, findings, metric };
}
