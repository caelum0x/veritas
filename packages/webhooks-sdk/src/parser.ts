// Parse and validate raw webhook payloads into typed WebhookEvent objects.

import { Result, ok, err } from "@veritas/core";
import { WebhookEventSchema, type WebhookEvent } from "./types.js";
import { verifyWebhookSignature, type VerifyOptions } from "./verify.js";
import { WebhookParseError, WebhookSignatureError } from "./errors.js";

export interface ParseOptions extends VerifyOptions {
  /** If true, skip signature verification (useful for local testing only). */
  skipSignatureVerification?: boolean;
}

export interface ParseInput {
  /** Raw request body string. */
  body: string;
  /** Value of the `X-Veritas-Signature` header. */
  signatureHeader: string;
  /** Webhook secret configured on the subscription. */
  secret: string;
}

/** Parse and optionally verify a raw webhook delivery. */
export function parseWebhookPayload(
  input: ParseInput,
  opts: ParseOptions = {},
): Result<WebhookEvent, WebhookParseError | WebhookSignatureError> {
  if (!opts.skipSignatureVerification) {
    const sigResult = verifyWebhookSignature(
      { signatureHeader: input.signatureHeader, body: input.body, secret: input.secret },
      { maxAgeMs: opts.maxAgeMs },
    );

    if (!sigResult.ok) {
      return err(sigResult.error);
    }
  }

  let raw: unknown;
  try {
    raw = JSON.parse(input.body);
  } catch {
    return err(new WebhookParseError("Request body is not valid JSON"));
  }

  const result = WebhookEventSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return err(new WebhookParseError(`Invalid webhook payload: ${issues}`));
  }

  return ok(result.data);
}

/** Parse without signature verification — for use in test/mock environments only. */
export function parseWebhookPayloadUnsafe(body: string): Result<WebhookEvent, WebhookParseError> {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return err(new WebhookParseError("Request body is not valid JSON"));
  }

  const result = WebhookEventSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return err(new WebhookParseError(`Invalid webhook payload: ${issues}`));
  }

  return ok(result.data);
}
