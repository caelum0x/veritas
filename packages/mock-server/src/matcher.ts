// Matches incoming request descriptors against MockMatcher criteria.
import type { MockMatcher } from "./mock.js";

export interface IncomingRequest {
  readonly method: string;
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

function headersMatch(
  expected: Record<string, string>,
  actual: Readonly<Record<string, string>>,
): boolean {
  return Object.entries(expected).every(
    ([k, v]) => actual[k.toLowerCase()] === v,
  );
}

function queryMatch(
  expected: Record<string, string>,
  actual: Readonly<Record<string, string>>,
): boolean {
  return Object.entries(expected).every(([k, v]) => actual[k] === v);
}

function bodyContainsMatch(expected: Record<string, unknown>, actual: unknown): boolean {
  if (typeof actual !== "object" || actual === null) return false;
  const rec = actual as Record<string, unknown>;
  return Object.entries(expected).every(([k, v]) => {
    if (typeof v === "object" && v !== null && typeof rec[k] === "object" && rec[k] !== null) {
      return bodyContainsMatch(v as Record<string, unknown>, rec[k]);
    }
    return rec[k] === v;
  });
}

function pathMatch(pattern: string, isRegex: boolean, actual: string): boolean {
  if (isRegex) {
    return new RegExp(pattern).test(actual);
  }
  if (pattern.includes("*") || pattern.includes(":")) {
    const regexStr = pattern
      .replace(/:[^/]+/g, "([^/]+)")
      .replace(/\*/g, ".*");
    return new RegExp(`^${regexStr}$`).test(actual);
  }
  return pattern === actual;
}

export function matchesRequest(matcher: MockMatcher, req: IncomingRequest): boolean {
  if (matcher.method && matcher.method !== req.method.toUpperCase()) return false;

  if (!pathMatch(matcher.path, matcher.pathIsRegex, req.path)) return false;

  if (matcher.query && !queryMatch(matcher.query, req.query)) return false;

  if (matcher.headers) {
    const lcHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      lcHeaders[k.toLowerCase()] = v;
    }
    if (!headersMatch(matcher.headers, lcHeaders)) return false;
  }

  if (matcher.bodyContains && !bodyContainsMatch(matcher.bodyContains, req.body)) return false;

  return true;
}
