// Maps raw inbound request data to verified domain event payloads.

import type { Request } from "express";
import { InboundHeadersSchema, type InboundHeaders } from "./inbound.schema.js";
import { ApiError } from "../../http/api-error.js";

export interface ExtractedInboundRequest {
  readonly deliveryId: string;
  readonly eventType: string;
  readonly signatureHeader: string;
  readonly rawBody: string;
  readonly payload: Record<string, unknown>;
}

/** Parses and validates required inbound webhook headers from an Express request. */
export function extractInboundHeaders(req: Request): InboundHeaders {
  const result = InboundHeadersSchema.safeParse(req.headers);
  if (!result.success) {
    const first = result.error.issues[0];
    throw ApiError.badRequest(first?.message ?? "Invalid request headers");
  }
  return result.data;
}

/** Extracts the raw body string; falls back to serialised body if capture middleware missed. */
export function getRawBody(req: Request): string {
  const raw = (req as Request & { rawBody?: string }).rawBody;
  if (typeof raw === "string" && raw.length > 0) return raw;
  return JSON.stringify(req.body ?? {});
}

/** Validates the request body is a plain JSON object. */
export function extractPayload(body: unknown): Record<string, unknown> {
  if (body !== null && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  throw ApiError.badRequest("Request body must be a JSON object");
}

/** Combines header extraction, raw body capture, and payload parsing into one structure. */
export function mapInboundRequest(req: Request): ExtractedInboundRequest {
  const headers = extractInboundHeaders(req);
  const rawBody = getRawBody(req);
  const payload = extractPayload(req.body);

  return {
    deliveryId: headers["x-veritas-delivery"],
    eventType: headers["x-veritas-event"],
    signatureHeader: headers["x-veritas-signature"],
    rawBody,
    payload,
  };
}
