// Request fingerprint — deterministic hash of method, path, and body for conflict detection.
import { createHash } from "node:crypto";
import { type Request } from "express";

export interface FingerprintInput {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

/** Compute a SHA-256 fingerprint of a request's method, path, and body. */
export function computeFingerprint(input: FingerprintInput): string {
  const canonical = JSON.stringify({
    method: input.method.toUpperCase(),
    path: input.path,
    body: input.body ?? null,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/** Extract fingerprint input from an Express request. */
export function fingerprintFromRequest(req: Request): FingerprintInput {
  return {
    method: req.method,
    path: req.path,
    body: req.body as unknown,
  };
}
