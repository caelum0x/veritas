// Verify incoming webhook delivery signatures using HMAC-SHA256.

import { timingSafeEqual, createHmac } from "crypto";
import { Result, ok, err } from "@veritas/core";
import { WebhookSignatureError } from "./errors.js";

export interface VerifySignatureInput {
  /** Value of the `X-Veritas-Signature` header. */
  signatureHeader: string;
  /** Raw request body as a string. */
  body: string;
  /** Webhook secret configured on the subscription. */
  secret: string;
}

export interface VerifyOptions {
  /** Max age in milliseconds before a signature is rejected. Default: 300_000 (5 min). */
  maxAgeMs?: number;
}

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1_000;

function parseSignatureHeader(header: string): Result<{ timestamp: number; signatures: string[] }, string> {
  const parts = header.split(",");
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();

    if (key === "t") {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) return err("Invalid timestamp in signature header");
      timestamp = parsed;
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (timestamp === null) return err("Missing timestamp in signature header");
  if (signatures.length === 0) return err("Missing v1 signature in header");

  return ok({ timestamp, signatures });
}

function computeHmac(secret: string, timestampMs: number, body: string): string {
  return createHmac("sha256", secret)
    .update(`${timestampMs}.${body}`, "utf8")
    .digest("hex");
}

/** Verify a webhook signature header. Returns ok(true) or err(WebhookSignatureError). */
export function verifyWebhookSignature(
  input: VerifySignatureInput,
  opts: VerifyOptions = {},
): Result<true, WebhookSignatureError> {
  const maxAgeMs = opts.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const parsed = parseSignatureHeader(input.signatureHeader);

  if (!parsed.ok) {
    return err(new WebhookSignatureError(parsed.error));
  }

  const { timestamp, signatures } = parsed.value;
  const ageDelta = Math.abs(Date.now() - timestamp);

  if (ageDelta > maxAgeMs) {
    return err(new WebhookSignatureError(`Signature expired: age ${ageDelta}ms exceeds ${maxAgeMs}ms`));
  }

  const expected = computeHmac(input.secret, timestamp, input.body);
  const expectedBuf = Buffer.from(expected, "hex");

  const valid = signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, "hex");
      if (sigBuf.length !== expectedBuf.length) return false;
      return timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });

  if (!valid) return err(new WebhookSignatureError("Signature mismatch"));

  return ok(true as const);
}

/** Convenience class wrapping verifyWebhookSignature with fixed options. */
export class WebhookVerifier {
  constructor(private readonly opts: VerifyOptions = {}) {}

  verify(input: VerifySignatureInput): Result<true, WebhookSignatureError> {
    return verifyWebhookSignature(input, this.opts);
  }
}
