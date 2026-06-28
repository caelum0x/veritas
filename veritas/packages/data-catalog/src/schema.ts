// Dataset schema definitions and validation using zod.
import { z } from "zod";
import { Result, ok, err } from "@veritas/core";
import { SchemaValidationError } from "./errors.js";
import type { DatasetSchema, SchemaField, SchemaFieldType } from "./types.js";

export const schemaFieldTypeSchema = z.enum([
  "string",
  "integer",
  "float",
  "boolean",
  "timestamp",
  "date",
  "bytes",
  "object",
  "array",
  "null",
]) satisfies z.ZodType<SchemaFieldType>;

export const schemaFieldSchema: z.ZodType<SchemaField> = z.object({
  name: z.string().min(1).max(128),
  type: schemaFieldTypeSchema,
  nullable: z.boolean(),
  description: z.string().max(512).optional(),
  tags: z.array(z.string()).optional(),
});

export const datasetSchemaSchema: z.ZodType<DatasetSchema> = z.object({
  version: z.number().int().positive(),
  fields: z.array(schemaFieldSchema).min(1),
  primaryKey: z.array(z.string()).optional(),
  description: z.string().max(1024).optional(),
});

export function validateDatasetSchema(
  raw: unknown
): Result<DatasetSchema, SchemaValidationError> {
  const parsed = datasetSchemaSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => i.message).join("; ");
    return err(new SchemaValidationError(detail));
  }
  return ok(parsed.data);
}

export function validatePrimaryKey(
  schema: DatasetSchema
): Result<void, SchemaValidationError> {
  if (!schema.primaryKey || schema.primaryKey.length === 0) return ok(undefined);
  const fieldNames = new Set(schema.fields.map((f) => f.name));
  const missing = schema.primaryKey.filter((k) => !fieldNames.has(k));
  if (missing.length > 0) {
    return err(new SchemaValidationError(`Primary key fields not in schema: ${missing.join(", ")}`));
  }
  return ok(undefined);
}

export function schemaDiff(
  before: DatasetSchema,
  after: DatasetSchema
): { added: readonly SchemaField[]; removed: readonly SchemaField[]; changed: readonly string[] } {
  const beforeMap = new Map(before.fields.map((f) => [f.name, f]));
  const afterMap = new Map(after.fields.map((f) => [f.name, f]));

  const added = after.fields.filter((f) => !beforeMap.has(f.name));
  const removed = before.fields.filter((f) => !afterMap.has(f.name));
  const changed = after.fields
    .filter((f) => {
      const prev = beforeMap.get(f.name);
      return prev && (prev.type !== f.type || prev.nullable !== f.nullable);
    })
    .map((f) => f.name);

  return { added, removed, changed };
}
