// RFC 7807 Problem Details object builder for structured API error responses.
export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

const BASE_URI = "https://veritas.local/errors";

export function makeProblem(
  status: number,
  title: string,
  detail?: string,
  instance?: string,
  extensions?: Record<string, unknown>,
): ProblemDetail {
  const type = `${BASE_URI}/${status}`;
  return Object.freeze({
    type,
    title,
    status,
    ...(detail ? { detail } : {}),
    ...(instance ? { instance } : {}),
    ...(extensions ?? {}),
  });
}

export function problemForStatus(
  status: number,
  detail?: string,
  instance?: string,
  extensions?: Record<string, unknown>,
): ProblemDetail {
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

  const title = titles[status] ?? "Error";
  return makeProblem(status, title, detail, instance, extensions);
}
