// Fetch-based Transport implementation using the native fetch API (Node 18+).
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Transport, RequestOptions, RawResponse } from "./transport.js";
import {
  SdkHttpError,
  SdkNetworkError,
  SdkTimeoutError,
  statusToCode,
} from "./errors.js";
import type { SdkConfig } from "../config.js";

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const url = new URL(`${normalized}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function extractResponseHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json() as unknown;
    } catch {
      return null;
    }
  }
  const text = await response.text();
  return text || null;
}

export class FetchTransport implements Transport {
  private readonly config: SdkConfig;

  constructor(config: SdkConfig) {
    this.config = config;
  }

  async request(options: RequestOptions): Promise<Result<RawResponse, SdkHttpError>> {
    const { method, path, query, body, headers = {}, timeoutMs, idempotencyKey } = options;
    const url = buildUrl(this.config.baseUrl, path, query);
    const effectiveTimeout = timeoutMs ?? this.config.timeoutMs;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${this.config.apiKey}`,
      "User-Agent": this.config.userAgent,
      ...headers,
    };

    if (idempotencyKey) {
      requestHeaders["Idempotency-Key"] = idempotencyKey;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      const responseHeaders = extractResponseHeaders(response);
      const responseBody = await parseBody(response);
      const rawResponse: RawResponse = {
        status: response.status,
        headers: responseHeaders,
        body: responseBody,
      };

      if (!response.ok) {
        const requestId = responseHeaders["x-request-id"];
        const retryAfterHeader = responseHeaders["retry-after"];
        const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : undefined;

        const bodyMessage =
          responseBody !== null &&
          typeof responseBody === "object" &&
          "error" in (responseBody as Record<string, unknown>)
            ? String((responseBody as Record<string, unknown>)["error"])
            : `HTTP ${response.status}`;

        return err(
          new SdkHttpError({
            message: bodyMessage,
            code: statusToCode(response.status),
            status: response.status,
            requestId,
            retryAfterMs,
          })
        );
      }

      return ok(rawResponse);
    } catch (cause: unknown) {
      clearTimeout(timer);

      if (cause instanceof DOMException && cause.name === "AbortError") {
        return err(new SdkTimeoutError(effectiveTimeout));
      }

      return err(new SdkNetworkError(
        cause instanceof Error ? cause.message : "Network request failed",
        cause
      ));
    }
  }
}
