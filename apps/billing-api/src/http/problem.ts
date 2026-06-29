// RFC 7807 Problem Details response builder for billing-api.

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

const BASE_TYPE_URI = "https://errors.veritas.dev/billing";

const CODE_TITLE_MAP: Record<string, string> = {
  NOT_FOUND: "Resource Not Found",
  CONFLICT: "Resource Conflict",
  VALIDATION: "Validation Error",
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  RATE_LIMITED: "Rate Limit Exceeded",
  UNAVAILABLE: "Service Unavailable",
  INTERNAL: "Internal Server Error",
};

export function buildProblem(
  status: number,
  code: string,
  detail: string,
  instance?: string,
  extensions?: Record<string, unknown>,
): ProblemDetails {
  return {
    type: `${BASE_TYPE_URI}/${code.toLowerCase().replace(/_/g, "-")}`,
    title: CODE_TITLE_MAP[code] ?? "Error",
    status,
    detail,
    ...(instance ? { instance } : {}),
    ...extensions,
  };
}
