// RFC 7807 problem+json formatting: converts error information to standard Problem Detail objects.
import type { Response } from "express";

export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

const BASE_URI = "https://veritas.croo.ai/problems";

const PROBLEM_TYPES: Readonly<Record<number, { type: string; title: string }>> = {
  400: { type: `${BASE_URI}/bad-request`,          title: "Bad Request" },
  401: { type: `${BASE_URI}/unauthorized`,         title: "Unauthorized" },
  403: { type: `${BASE_URI}/forbidden`,            title: "Forbidden" },
  404: { type: `${BASE_URI}/not-found`,            title: "Not Found" },
  409: { type: `${BASE_URI}/conflict`,             title: "Conflict" },
  422: { type: `${BASE_URI}/unprocessable-entity`, title: "Unprocessable Entity" },
  429: { type: `${BASE_URI}/rate-limited`,         title: "Too Many Requests" },
  500: { type: `${BASE_URI}/internal-error`,       title: "Internal Server Error" },
  503: { type: `${BASE_URI}/service-unavailable`,  title: "Service Unavailable" },
};

const FALLBACK_PROBLEM = { type: `${BASE_URI}/error`, title: "An error occurred" };

export function buildProblem(status: number, detail: string, extra?: Record<string, unknown>): ProblemDetail {
  const { type, title } = PROBLEM_TYPES[status] ?? FALLBACK_PROBLEM;
  return { type, title, status, detail, ...extra };
}

export function sendProblem(res: Response, status: number, detail: string, extra?: Record<string, unknown>): void {
  const problem = buildProblem(status, detail, extra);
  res.status(status).setHeader("Content-Type", "application/problem+json").json(problem);
}
