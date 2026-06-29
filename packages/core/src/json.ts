// Canonical JSON serialization and safe parsing utilities.

import { isObject } from "./guards.js";
import { err, ok, type Result } from "./result.js";

/** A JSON-serializable value. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Produce a deterministic JSON string with recursively sorted object keys.
 * Identical logical values always yield identical strings (stable hashing).
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (isObject(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const v = value[key];
      if (v !== undefined) {
        sorted[key] = sortValue(v);
      }
    }
    return sorted;
  }
  return value;
}

/** Parse a JSON string, returning a Result instead of throwing. */
export function safeParseJson(text: string): Result<JsonValue, Error> {
  try {
    return ok(JSON.parse(text) as JsonValue);
  } catch (cause) {
    return err(
      cause instanceof Error ? cause : new Error("Failed to parse JSON"),
    );
  }
}
