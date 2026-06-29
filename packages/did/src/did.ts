// DID parsing, validation, and core DID value types per W3C DID Core spec.
import { z } from "zod";
import { ValidationError } from "@veritas/core";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

/** Supported DID methods in this implementation. */
export type DidMethod = "key" | "web" | "pkh";

/** Branded DID string type. */
export type Did = string & { readonly __brand: "Did" };

/** Structured DID components parsed from a DID string. */
export interface ParsedDid {
  readonly did: Did;
  readonly method: string;
  readonly methodSpecificId: string;
  readonly path?: string;
  readonly query?: string;
  readonly fragment?: string;
}

/** Zod schema for validating raw DID strings. */
export const didSchema = z
  .string()
  .regex(/^did:[a-z0-9]+:[^\s#?]+/, "Must be a valid DID string");

/** Type guard: returns true when value is a syntactically valid DID. */
export function isDid(value: unknown): value is Did {
  return typeof value === "string" && /^did:[a-z0-9]+:[^\s#?]+/.test(value);
}

/** Cast a validated string to the Did brand — throws if invalid. */
export function asDid(value: string): Did {
  if (!isDid(value)) {
    throw new ValidationError({ message: `Invalid DID: ${value}` });
  }
  return value as Did;
}

/**
 * Parse a DID string into its structured components.
 * Handles optional path, query, and fragment according to RFC 3986 conventions.
 */
export function parseDid(raw: string): Result<ParsedDid, ValidationError> {
  const trimmed = raw.trim();
  // Extract fragment first (after #)
  const hashIdx = trimmed.indexOf("#");
  const withoutFragment = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
  const fragment = hashIdx >= 0 ? trimmed.slice(hashIdx + 1) : undefined;

  // Extract query (after ?)
  const qIdx = withoutFragment.indexOf("?");
  const withoutQuery = qIdx >= 0 ? withoutFragment.slice(0, qIdx) : withoutFragment;
  const query = qIdx >= 0 ? withoutFragment.slice(qIdx + 1) : undefined;

  // Parse scheme:method:methodSpecificId[/path]
  const match = withoutQuery.match(/^(did):([a-z0-9]+):([^\s]+)$/);
  if (!match) {
    return err(new ValidationError({ message: `Invalid DID format: ${raw}` }));
  }

  const [, , method, rest] = match as [string, string, string, string];
  // Split path from methodSpecificId (path starts after first slash in the rest that follows the minimum id)
  const slashIdx = rest.indexOf("/");
  const methodSpecificId = slashIdx >= 0 ? rest.slice(0, slashIdx) : rest;
  const path = slashIdx >= 0 ? rest.slice(slashIdx) : undefined;

  if (!methodSpecificId) {
    return err(new ValidationError({ message: `DID method-specific identifier is empty: ${raw}` }));
  }

  const did = `did:${method}:${methodSpecificId}` as Did;

  return ok({ did, method, methodSpecificId, path, query, fragment });
}

/** Return the DID without fragment, path, or query — the bare DID URL. */
export function bareDid(raw: string): Result<Did, ValidationError> {
  const parsed = parseDid(raw);
  if (parsed.ok) return ok(parsed.value.did);
  return parsed;
}
