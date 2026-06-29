// Verify incoming webhook signatures to authenticate delivery callbacks.

import { timingSafeEqual, createHmac } from "crypto";
import { Result, ok, err } from "@veritas/core";
import { computeSignature } from "./signer.js";

export interface VerifyOptions {
  /** Max age in milliseconds before a signature is considered expired. Default: 5 minutes. */
  maxAgeMs?: number;
}

export interface VerifyInput {
  signatureHeader: string;
  body: string;
  secret: string;
}

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

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

export function verifySignature(
  input: VerifyInput,
  opts: VerifyOptions = {}
): Result<true, string> {
  const maxAgeMs = opts.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const parsed = parseSignatureHeader(input.signatureHeader);

  if (parsed.ok === false) {
    return err(parsed.error);
  }

  const { timestamp, signatures } = parsed.value;
  const now = Date.now();

  if (Math.abs(now - timestamp) > maxAgeMs) {
    return err(`Signature expired: timestamp ${timestamp} is outside the ${maxAgeMs}ms window`);
  }

  const expected = computeSignature(input.secret, timestamp, input.body);
  const expectedBuf = Buffer.from(expected, "hex");

  const isValid = signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, "hex");
      if (sigBuf.length !== expectedBuf.length) return false;
      return timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });

  if (!isValid) return err("Signature mismatch");

  return ok(true as const);
}

export class WebhookVerifier {
  private readonly opts: VerifyOptions;

  constructor(opts: VerifyOptions = {}) {
    this.opts = opts;
  }

  verify(input: VerifyInput): Result<true, string> {
    return verifySignature(input, this.opts);
  }
}

export function createVerifier(opts?: VerifyOptions): WebhookVerifier {
  return new WebhookVerifier(opts);
}
