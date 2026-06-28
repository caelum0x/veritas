// Zod parsing helpers that integrate with Result and ValidationError.

import { z } from "zod";
import { ValidationError, type FieldIssue } from "./errors/validation-error.js";
import { err, ok, type Result } from "./result.js";

/** Convert zod issues into platform FieldIssue records. */
export function zodIssuesToFieldIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
}

/** Parse with a schema, returning a Result<ValidationError> instead of throwing. */
export function safeParse<T>(
  schema: z.ZodType<T>,
  input: unknown,
): Result<T, ValidationError> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  return err(ValidationError.fromIssues(zodIssuesToFieldIssues(parsed.error)));
}

/** Parse with a schema, throwing a ValidationError on failure. */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = safeParse(schema, input);
  if (result.ok) return result.value;
  throw result.error;
}
