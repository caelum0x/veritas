// RFC 7807 Problem Details document builder for structured error responses.

export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

const BASE_URI = "https://veritas.io/problems";

/** Build a Problem Detail document for a given HTTP status code and detail message. */
export function buildProblem(
  status: number,
  title: string,
  detail?: string,
  instance?: string,
  extensions?: Record<string, unknown>,
): ProblemDetail {
  return {
    type: `${BASE_URI}/${toSlug(title)}`,
    title,
    status,
    ...(detail !== undefined ? { detail } : {}),
    ...(instance !== undefined ? { instance } : {}),
    ...(extensions ?? {}),
  };
}

function toSlug(title: string): string {
  return title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/** Common problem factories. */
export const Problems = {
  unauthorized: (detail?: string, instance?: string): ProblemDetail =>
    buildProblem(401, "Unauthorized", detail, instance),
  forbidden: (detail?: string, instance?: string): ProblemDetail =>
    buildProblem(403, "Forbidden", detail, instance),
  notFound: (detail?: string, instance?: string): ProblemDetail =>
    buildProblem(404, "Not Found", detail, instance),
  unprocessable: (detail?: string, instance?: string): ProblemDetail =>
    buildProblem(422, "Unprocessable Entity", detail, instance),
  tooManyRequests: (detail?: string, instance?: string): ProblemDetail =>
    buildProblem(429, "Too Many Requests", detail, instance),
  internal: (detail?: string, instance?: string): ProblemDetail =>
    buildProblem(500, "Internal Server Error", detail, instance),
} as const;
