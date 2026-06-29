// Transport interface abstraction for making HTTP requests in the SDK.
import type { Result } from "@veritas/core";
import type { SdkHttpError } from "./errors.js";

export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  /** Override timeout for this specific request (ms) */
  timeoutMs?: number;
  /** Idempotency key for mutating requests */
  idempotencyKey?: string;
}

export interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface Transport {
  /**
   * Execute a single HTTP request and return a Result.
   * The transport is responsible for serialization but NOT for retry logic.
   */
  request(options: RequestOptions): Promise<Result<RawResponse, SdkHttpError>>;
}
