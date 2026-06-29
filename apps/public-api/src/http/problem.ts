// problem.ts: RFC 7807 Problem Details object builder for structured error responses.

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

const TYPE_BASE = "https://veritas.ai/errors/";

/** Build an RFC 7807 Problem Details object. */
export function buildProblem(
  status: number,
  title: string,
  detail?: string,
  instance?: string,
  extra?: Record<string, unknown>,
): ProblemDetails {
  return {
    type: `${TYPE_BASE}${title.toLowerCase().replace(/\s+/g, "-")}`,
    title,
    status,
    ...(detail !== undefined ? { detail } : {}),
    ...(instance !== undefined ? { instance } : {}),
    ...extra,
  };
}

/** Map an HTTP status code to a standard problem title. */
export function statusTitle(status: number): string {
  switch (status) {
    case 400: return "Bad Request";
    case 401: return "Unauthorized";
    case 402: return "Payment Required";
    case 403: return "Forbidden";
    case 404: return "Not Found";
    case 409: return "Conflict";
    case 422: return "Unprocessable Entity";
    case 429: return "Too Many Requests";
    case 500: return "Internal Server Error";
    case 503: return "Service Unavailable";
    default: return "Error";
  }
}
