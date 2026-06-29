// Helpers for reading and coercing process.env values with type safety.

import { ValidationError } from "@veritas/core";

/** Read a required string env var or throw. */
export function requireEnv(key: string): string {
  const val = process.env[key];
  if (val === undefined || val === "") {
    throw new ValidationError({ message: `Missing required environment variable: ${key}` });
  }
  return val;
}

/** Read an optional string env var with a fallback. */
export function optionalEnv(key: string, fallback: string): string {
  const val = process.env[key];
  return val !== undefined && val !== "" ? val : fallback;
}

/** Read an env var as a positive integer, throws if present but not a valid number. */
export function envInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (val === undefined || val === "") return fallback;
  const n = parseInt(val, 10);
  if (isNaN(n)) {
    throw new ValidationError({ message: `Environment variable ${key} must be an integer, got: "${val}"` });
  }
  return n;
}

/** Read an env var as a float, throws if present but not a valid number. */
export function envFloat(key: string, fallback: number): number {
  const val = process.env[key];
  if (val === undefined || val === "") return fallback;
  const n = parseFloat(val);
  if (isNaN(n)) {
    throw new ValidationError({ message: `Environment variable ${key} must be a number, got: "${val}"` });
  }
  return n;
}

/** Read an env var as a boolean ("true"/"1"/"yes" → true, anything else → false). */
export function envBool(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (val === undefined || val === "") return fallback;
  return val === "true" || val === "1" || val === "yes";
}

/** Read an env var as one of a fixed set of string literals. */
export function envEnum<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const val = process.env[key];
  if (val === undefined || val === "") return fallback;
  if (!allowed.includes(val as T)) {
    throw new ValidationError({
      message: `Environment variable ${key} must be one of [${allowed.join(", ")}], got: "${val}"`,
    });
  }
  return val as T;
}
