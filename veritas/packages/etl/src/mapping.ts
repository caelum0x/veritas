// Field mapping engine — maps source fields to target schema with optional coercion.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { RawRecord, TransformedRecord, FieldType, FieldMapping } from "./types.js";
import { MappingError } from "./errors.js";

export interface MappingSchema {
  readonly sourceId: string;
  readonly fields: ReadonlyArray<FieldMapping>;
  readonly dropUnmapped?: boolean;
}

function coerce(value: unknown, transform: FieldMapping["transform"]): unknown {
  if (value === null || value === undefined) return null;
  switch (transform) {
    case "lowercase":
      return String(value).toLowerCase();
    case "uppercase":
      return String(value).toUpperCase();
    case "trim":
      return String(value).trim();
    case "cast_string":
      return String(value);
    case "cast_number": {
      const n = Number(value);
      return Number.isNaN(n) ? null : n;
    }
    case "none":
    default:
      return value;
  }
}

export function applyMapping(
  record: RawRecord,
  schema: MappingSchema,
  now: string,
): Result<TransformedRecord, MappingError> {
  const fields: Record<string, unknown> = {};

  for (const spec of schema.fields) {
    const raw = record.fields[spec.sourceField];
    const resolved = raw === undefined || raw === null ? spec.defaultValue : raw;

    if ((resolved === undefined || resolved === null) && spec.required) {
      return err(
        new MappingError(spec.sourceField, {
          message: `Required field "${spec.sourceField}" is missing in record "${record.id}"`,
        }),
      );
    }

    const coerced = coerce(resolved, spec.transform);
    fields[spec.targetField] = coerced;
  }

  if (!schema.dropUnmapped) {
    const mapped = new Set(schema.fields.map((f) => f.sourceField));
    for (const [key, value] of Object.entries(record.fields)) {
      if (!mapped.has(key)) {
        fields[key] = value;
      }
    }
  }

  return ok(
    Object.freeze({
      id: record.id,
      fields: Object.freeze(fields),
      meta: record.meta,
      sourceId: schema.sourceId,
      extractedAt: now,
      transformedAt: now,
    }),
  );
}

export function buildMappingSchema(
  sourceId: string,
  fields: ReadonlyArray<FieldMapping>,
  dropUnmapped = false,
): MappingSchema {
  return Object.freeze({ sourceId, fields, dropUnmapped });
}
