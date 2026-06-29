// HMAC-SHA256 payload signer for outgoing webhook deliveries.

import { createHmac } from "crypto";
import { AppError } from "@veritas/core";

export interface SignedPayload {
  body: string;
  signature: string;
  timestamp: number;
  signatureHeader: string;
}

export interface SignerOptions {
  secret: string;
  algorithm?: "sha256" | "sha512";
}

export class WebhookSigner {
  private readonly secret: string;
  private readonly algorithm: string;

  constructor(opts: SignerOptions) {
    if (!opts.secret || opts.secret.length < 8) {
      throw new AppError("VALIDATION", 422, "Webhook secret must be at least 8 characters");
    }
    this.secret = opts.secret;
    this.algorithm = opts.algorithm ?? "sha256";
  }

  sign(payload: Record<string, unknown>, timestampMs?: number): SignedPayload {
    const ts = timestampMs ?? Date.now();
    const body = JSON.stringify(payload);
    const signingInput = `${ts}.${body}`;
    const signature = createHmac(this.algorithm, this.secret)
      .update(signingInput, "utf8")
      .digest("hex");
    const signatureHeader = `t=${ts},v1=${signature}`;
    return { body, signature, timestamp: ts, signatureHeader };
  }

  buildSignatureHeader(signature: string, timestampMs: number): string {
    return `t=${timestampMs},v1=${signature}`;
  }
}

export function createSigner(secret: string): WebhookSigner {
  return new WebhookSigner({ secret });
}

export function computeSignature(secret: string, timestampMs: number, body: string): string {
  const signingInput = `${timestampMs}.${body}`;
  return createHmac("sha256", secret).update(signingInput, "utf8").digest("hex");
}
