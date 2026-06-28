// Presigned URL interface — generate time-limited URLs for object access.
import type { Result } from "@veritas/core";
import type { StorageError } from "./errors.js";

export type SignedUrlMethod = "GET" | "PUT" | "DELETE";

export interface SignedUrlOptions {
  readonly method: SignedUrlMethod;
  /** Expiration in seconds from now. */
  readonly expiresIn: number;
  readonly contentType?: string;
  readonly metadata?: Record<string, string>;
}

export interface SignedUrl {
  readonly url: string;
  readonly method: SignedUrlMethod;
  readonly key: string;
  readonly expiresAt: Date;
  readonly headers?: Record<string, string>;
}

export interface SignedUrlProvider {
  sign(key: string, options: SignedUrlOptions): Promise<Result<SignedUrl, StorageError>>;
}

export function isExpired(signed: SignedUrl, now: Date = new Date()): boolean {
  return signed.expiresAt.getTime() <= now.getTime();
}

export function makeSignedUrl(
  url: string,
  key: string,
  method: SignedUrlMethod,
  expiresIn: number,
  headers?: Record<string, string>,
): SignedUrl {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  return { url, key, method, expiresAt, headers };
}
