// Upstream HTTP client for the Veritas REST API — wraps fetch with auth forwarding and error mapping.
import { type Result, ok, err, tryAsync } from "@veritas/core";

export interface UpstreamConfig {
  readonly baseUrl: string;
  /** Shared service token forwarded in X-Internal-Token header. */
  readonly serviceToken: string;
  readonly timeoutMs: number;
}

export interface ForwardOptions {
  readonly method: string;
  readonly path: string;
  /** Bearer token from the BFF session to propagate to the upstream. */
  readonly sessionToken?: string;
  readonly body?: unknown;
  readonly query?: Record<string, string | number | boolean | undefined>;
}

export interface UpstreamError {
  readonly status: number;
  readonly code: string;
  readonly message: string;
}

/** Build a query-string from a params object, omitting undefined values. */
function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(
    (pair): pair is [string, string | number | boolean] => pair[1] !== undefined,
  );
  if (entries.length === 0) return "";
  const qs = new URLSearchParams(entries.map(([k, v]): [string, string] => [k, String(v)]));
  return `?${qs.toString()}`;
}

function isUpstreamError(v: unknown): v is UpstreamError {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>)["status"] === "number" &&
    typeof (v as Record<string, unknown>)["code"] === "string"
  );
}

/** Typed upstream client that forwards BFF requests to the Veritas API. */
export class VeritasUpstream {
  constructor(private readonly config: UpstreamConfig) {}

  /** Forward an authenticated request; returns parsed JSON body or an UpstreamError. */
  async forward<T>(opts: ForwardOptions): Promise<Result<T, UpstreamError>> {
    const { method, path, sessionToken, body, query } = opts;
    const qs = query ? buildQuery(query) : "";
    const url = `${this.config.baseUrl}${path}${qs}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Internal-Token": this.config.serviceToken,
    };
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    const result = await tryAsync(async () => {
      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);

      let json: unknown;
      try {
        json = await res.json();
      } catch {
        json = undefined;
      }

      if (!res.ok) {
        const apiErr = (json as { error?: { code?: string; message?: string } } | undefined)
          ?.error;
        return Promise.reject({
          status: res.status,
          code: apiErr?.code ?? "UPSTREAM_ERROR",
          message: apiErr?.message ?? `Upstream returned ${res.status}`,
        } satisfies UpstreamError);
      }

      return json as T;
    });

    if (!result.ok) {
      const raw = result.error as unknown;
      if (isUpstreamError(raw)) return err(raw);
      if (raw instanceof Error && raw.name === "AbortError") {
        return err({ status: 504, code: "UPSTREAM_TIMEOUT", message: "Upstream request timed out" });
      }
      const msg = raw instanceof Error ? raw.message : String(raw);
      return err({ status: 502, code: "UPSTREAM_UNAVAILABLE", message: msg });
    }

    return ok(result.value);
  }

  /** Convenience GET. */
  get<T>(
    path: string,
    opts?: Omit<ForwardOptions, "method" | "path" | "body">,
  ): Promise<Result<T, UpstreamError>> {
    return this.forward<T>({ method: "GET", path, ...opts });
  }

  /** Convenience POST. */
  post<T>(
    path: string,
    body: unknown,
    opts?: Omit<ForwardOptions, "method" | "path" | "body">,
  ): Promise<Result<T, UpstreamError>> {
    return this.forward<T>({ method: "POST", path, body, ...opts });
  }

  /** Convenience PATCH. */
  patch<T>(
    path: string,
    body: unknown,
    opts?: Omit<ForwardOptions, "method" | "path" | "body">,
  ): Promise<Result<T, UpstreamError>> {
    return this.forward<T>({ method: "PATCH", path, body, ...opts });
  }

  /** Convenience DELETE. */
  delete<T>(
    path: string,
    opts?: Omit<ForwardOptions, "method" | "path" | "body">,
  ): Promise<Result<T, UpstreamError>> {
    return this.forward<T>({ method: "DELETE", path, ...opts });
  }
}
