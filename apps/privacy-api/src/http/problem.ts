// RFC 7807 Problem Details serializer for structured HTTP error responses.

export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

const TYPE_BASE = "https://veritas.io/errors/";

export function makeProblem(
  status: number,
  code: string,
  detail: string,
  instance?: string,
  extra?: Record<string, unknown>,
): ProblemDetail {
  return {
    type: `${TYPE_BASE}${code.toLowerCase().replace(/_/g, "-")}`,
    title: titleFor(status),
    status,
    detail,
    ...(instance !== undefined ? { instance } : {}),
    ...(extra ?? {}),
  };
}

function titleFor(status: number): string {
  const titles: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    503: "Service Unavailable",
  };
  return titles[status] ?? "Error";
}
