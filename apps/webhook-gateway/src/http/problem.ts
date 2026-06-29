// RFC 7807 Problem Details serializer for structured HTTP error responses.

export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

const BASE_URI = "https://veritas.dev/errors";

export function toProblemDetail(
  status: number,
  code: string,
  detail: string,
  extensions: Record<string, unknown> = {},
): ProblemDetail {
  return {
    type: `${BASE_URI}/${code.toLowerCase().replace(/_/g, "-")}`,
    title: toTitle(code),
    status,
    detail,
    ...extensions,
  };
}

function toTitle(code: string): string {
  return code
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
