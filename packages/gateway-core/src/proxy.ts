// Upstream proxy interface: contract for forwarding requests to upstream services.
import type { Result } from "@veritas/core";
import type { IncomingRequest } from "./router.js";

export interface ProxyResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly durationMs: number;
}

export interface ProxyRequest extends IncomingRequest {
  readonly body: unknown;
  readonly upstreamUrl: string;
  readonly timeoutMs: number;
}

export interface ProxyError {
  readonly code: "TIMEOUT" | "CONNECTION_ERROR" | "UPSTREAM_ERROR" | "INVALID_RESPONSE";
  readonly message: string;
  readonly status?: number;
}

/** Proxy interface that all transport implementations must satisfy. */
export interface Proxy {
  forward(req: ProxyRequest): Promise<Result<ProxyResponse, ProxyError>>;
}

/** Build a ProxyError from a caught unknown value. */
export function toProxyError(err: unknown, defaultCode: ProxyError["code"] = "CONNECTION_ERROR"): ProxyError {
  if (err instanceof Error) {
    const isTimeout =
      err.message.toLowerCase().includes("timeout") ||
      err.name === "AbortError";
    return {
      code: isTimeout ? "TIMEOUT" : defaultCode,
      message: err.message,
    };
  }
  return { code: defaultCode, message: String(err) };
}

/** Merge two header maps (b overrides a), returning a new frozen record. */
export function mergeHeaders(
  a: Readonly<Record<string, string>>,
  b: Readonly<Record<string, string>>
): Readonly<Record<string, string>> {
  return Object.freeze({ ...a, ...b });
}
