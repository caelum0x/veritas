// RFC 7807 Problem Details response builder.

export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

const BASE_URI = "https://veritas.croo.ai/problems";

/** Build a Problem Details object for a given status code and title. */
export function problem(
  status: number,
  title: string,
  detail?: string,
  instance?: string,
  extra?: Record<string, unknown>
): ProblemDetail {
  return {
    type: `${BASE_URI}/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))}`,
    title,
    status,
    ...(detail !== undefined && { detail }),
    ...(instance !== undefined && { instance }),
    ...extra,
  };
}

export const PROBLEMS = {
  badRequest: (detail?: string, instance?: string) =>
    problem(400, "Bad Request", detail, instance),
  unauthorized: (detail?: string) =>
    problem(401, "Unauthorized", detail),
  forbidden: (detail?: string) =>
    problem(403, "Forbidden", detail),
  notFound: (detail?: string, instance?: string) =>
    problem(404, "Not Found", detail, instance),
  conflict: (detail?: string) =>
    problem(409, "Conflict", detail),
  unprocessableEntity: (detail?: string) =>
    problem(422, "Unprocessable Entity", detail),
  tooManyRequests: (detail?: string) =>
    problem(429, "Too Many Requests", detail),
  internalServerError: (detail?: string) =>
    problem(500, "Internal Server Error", detail),
  serviceUnavailable: (detail?: string) =>
    problem(503, "Service Unavailable", detail),
} as const;
