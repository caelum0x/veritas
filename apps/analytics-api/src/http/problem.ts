// RFC 7807 Problem Details response shape for structured error responses.
export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

/** Build an RFC 7807 Problem Details object. */
export function makeProblem(
  status: number,
  title: string,
  detail?: string,
  extra?: Record<string, unknown>,
): ProblemDetail {
  return Object.freeze({
    type: `https://veritas.dev/errors/${title.toLowerCase().replace(/\s+/g, "-")}`,
    title,
    status,
    ...(detail ? { detail } : {}),
    ...(extra ?? {}),
  });
}

/** Well-known problem titles by HTTP status. */
export const ProblemTitles: Record<number, string> = {
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
