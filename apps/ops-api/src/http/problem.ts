// RFC 7807 Problem Details object builder for structured API error responses.
import type { Response } from "express";

export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

const TYPE_BASE = "https://veritas.internal/problems";

const PROBLEM_TYPES: Readonly<Record<string, string>> = {
  NOT_FOUND: `${TYPE_BASE}/not-found`,
  CONFLICT: `${TYPE_BASE}/conflict`,
  VALIDATION_ERROR: `${TYPE_BASE}/validation-error`,
  UNAUTHORIZED: `${TYPE_BASE}/unauthorized`,
  FORBIDDEN: `${TYPE_BASE}/forbidden`,
  RATE_LIMITED: `${TYPE_BASE}/rate-limited`,
  INTERNAL_ERROR: `${TYPE_BASE}/internal-error`,
};

export function buildProblem(
  code: string,
  status: number,
  detail?: string,
  extensions?: Record<string, unknown>,
): ProblemDetail {
  return {
    type: PROBLEM_TYPES[code] ?? `${TYPE_BASE}/error`,
    title: code.replace(/_/g, " ").toLowerCase(),
    status,
    ...(detail != null ? { detail } : {}),
    ...extensions,
  };
}

/** Send an RFC 7807 Problem Details response. */
export function sendProblem(
  res: Response,
  status: number,
  code: string,
  detail?: string,
  extensions?: Record<string, unknown>,
): void {
  const problem = buildProblem(code, status, detail, extensions);
  res
    .status(status)
    .setHeader("Content-Type", "application/problem+json")
    .json(problem);
}
