// Parse and validate CAP negotiation requirements into a typed ParsedRequirements object.

import { z } from "zod";
import { ok, err } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import { ValidationError } from "@veritas/core";
import type { ParsedRequirements } from "./types.js";

const effortSchema = z.enum(["low", "standard", "high"]).default("standard");

const requirementsPayloadSchema = z.object({
  text: z.string().min(1).optional(),
  claims: z.array(z.string().min(1)).optional(),
  effort: effortSchema,
  maxClaims: z.number().int().min(1).max(100).optional(),
  webhookUrl: z.string().url().optional(),
  callbackOrderId: z.string().optional(),
}).refine(
  (d) => d.text !== undefined || (d.claims !== undefined && d.claims.length > 0),
  { message: "Either 'text' or at least one entry in 'claims' is required." },
);

/**
 * Parse an unknown CAP requirements payload into a validated ParsedRequirements.
 * Returns a ValidationError if the payload is invalid.
 */
export function parseRequirements(
  raw: unknown,
): Result<ParsedRequirements, AppError> {
  const result = requirementsPayloadSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => i.message).join("; ");
    return err(
      new ValidationError({ message: `Invalid CAP requirements: ${issues}` }) as AppError,
    );
  }
  const data = result.data;
  return ok({
    text: data.text ?? data.claims!.join("\n"),
    claims: data.claims as readonly string[] | undefined,
    effort: data.effort,
    maxClaims: data.maxClaims,
    webhookUrl: data.webhookUrl,
    callbackOrderId: data.callbackOrderId,
  });
}

/**
 * Extract a human-readable label from a raw requirements payload for logging.
 * Falls back to a generic placeholder when content cannot be extracted.
 */
export function labelForRequirements(raw: unknown): string {
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj["text"] === "string" && obj["text"].length > 0) {
      return obj["text"].slice(0, 80);
    }
    if (Array.isArray(obj["claims"]) && obj["claims"].length > 0) {
      const first = obj["claims"][0];
      if (typeof first === "string") {
        return first.slice(0, 80);
      }
    }
  }
  return "<unknown requirements>";
}
