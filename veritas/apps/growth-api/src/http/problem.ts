// RFC 7807 Problem Details serializer for structured HTTP error responses.
export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

const BASE_URI = "https://veritas.ai/errors";

const STATUS_TITLES: Readonly<Record<number, string>> = {
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

export function buildProblem(
  status: number,
  code: string,
  detail: string,
  instance?: string,
  extra?: Record<string, unknown>,
): ProblemDetail {
  return {
    type: `${BASE_URI}/${code.toLowerCase().replace(/_/g, "-")}`,
    title: STATUS_TITLES[status] ?? "Error",
    status,
    detail,
    ...(instance !== undefined ? { instance } : {}),
    ...(extra ?? {}),
  };
}
