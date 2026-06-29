// RFC 7807 Problem Details serialiser for standardised error responses.
export type ProblemDetails = {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
};

const BASE_URI = "https://veritas.dev/problems";

export function makeProblem(
  status: number,
  code: string,
  detail?: string,
  extensions?: Record<string, unknown>,
): ProblemDetails {
  const slugs: Record<number, string> = {
    400: "bad-request",
    401: "unauthorized",
    403: "forbidden",
    404: "not-found",
    409: "conflict",
    422: "unprocessable-entity",
    429: "too-many-requests",
    500: "internal-error",
    503: "service-unavailable",
  };
  const slug = slugs[status] ?? "error";
  return {
    type: `${BASE_URI}/${slug}`,
    title: code,
    status,
    ...(detail !== undefined ? { detail } : {}),
    ...(extensions ?? {}),
  };
}

export const PROBLEM_CONTENT_TYPE = "application/problem+json";
