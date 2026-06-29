// RFC 7807 Problem Details object builder for structured error responses.
export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

const BASE_URI = "https://veritas.dev/errors";

/** Build a Problem Details object from status + title. */
export function problem(
  status: number,
  title: string,
  detail?: string,
  extensions?: Record<string, unknown>,
): ProblemDetail {
  return {
    type: `${BASE_URI}/${status}`,
    title,
    status,
    ...(detail !== undefined ? { detail } : {}),
    ...extensions,
  };
}

/** Map HTTP status codes to default RFC 7807 titles. */
export function titleForStatus(status: number): string {
  switch (status) {
    case 400: return "Bad Request";
    case 401: return "Unauthorized";
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
