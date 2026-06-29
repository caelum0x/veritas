// Convert Zod schema definitions to OpenAPI-compatible JSON Schema objects

import { z } from 'zod';
import type { JsonSchema, SchemaType } from './document.js';

export interface ConversionOptions {
  readonly depth?: number;
  readonly maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 10;

function zodTypeToJsonSchema(zodType: z.ZodTypeAny, opts: ConversionOptions = {}): JsonSchema {
  const depth = opts.depth ?? 0;
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
  const next: ConversionOptions = { ...opts, depth: depth + 1 };

  if (depth > maxDepth) {
    return {};
  }

  const def = zodType._def as Record<string, unknown>;
  const typeName = def['typeName'] as string | undefined;

  switch (typeName) {
    case 'ZodString': {
      const checks = (def['checks'] as Array<{ kind: string; value?: unknown; regex?: { source: string } }>) ?? [];
      const schema: JsonSchema = { type: 'string' };
      const minLen = checks.find(c => c.kind === 'min');
      const maxLen = checks.find(c => c.kind === 'max');
      const pattern = checks.find(c => c.kind === 'regex');
      const emailCheck = checks.find(c => c.kind === 'email');
      const urlCheck = checks.find(c => c.kind === 'url');
      const uuidCheck = checks.find(c => c.kind === 'uuid');
      const datetimeCheck = checks.find(c => c.kind === 'datetime');

      return {
        ...schema,
        ...(minLen !== undefined ? { minLength: minLen.value as number } : {}),
        ...(maxLen !== undefined ? { maxLength: maxLen.value as number } : {}),
        ...(pattern !== undefined && pattern.regex !== undefined ? { pattern: pattern.regex.source } : {}),
        ...(emailCheck !== undefined ? { format: 'email' } : {}),
        ...(urlCheck !== undefined ? { format: 'uri' } : {}),
        ...(uuidCheck !== undefined ? { format: 'uuid' } : {}),
        ...(datetimeCheck !== undefined ? { format: 'date-time' } : {}),
      };
    }

    case 'ZodNumber': {
      const checks = (def['checks'] as Array<{ kind: string; value?: unknown; inclusive?: boolean }>) ?? [];
      const intCheck = checks.find(c => c.kind === 'int');
      const minCheck = checks.find(c => c.kind === 'min');
      const maxCheck = checks.find(c => c.kind === 'max');
      const type: SchemaType = intCheck !== undefined ? 'integer' : 'number';

      return {
        type,
        ...(minCheck !== undefined
          ? minCheck.inclusive === false
            ? { exclusiveMinimum: minCheck.value as number }
            : { minimum: minCheck.value as number }
          : {}),
        ...(maxCheck !== undefined
          ? maxCheck.inclusive === false
            ? { exclusiveMaximum: maxCheck.value as number }
            : { maximum: maxCheck.value as number }
          : {}),
      };
    }

    case 'ZodBigInt':
      return { type: 'integer', format: 'int64' };

    case 'ZodBoolean':
      return { type: 'boolean' };

    case 'ZodNull':
      return { type: 'null' };

    case 'ZodUndefined':
      return {};

    case 'ZodLiteral': {
      const value = def['value'];
      if (typeof value === 'string') return { type: 'string', const: value };
      if (typeof value === 'number') return { type: 'number', const: value };
      if (typeof value === 'boolean') return { type: 'boolean', const: value };
      return { const: value };
    }

    case 'ZodEnum': {
      const values = def['values'] as string[];
      return { type: 'string', enum: values };
    }

    case 'ZodNativeEnum': {
      const enumValues = def['values'] as Record<string, unknown>;
      const vals = Object.values(enumValues).filter(v => typeof v === 'string' || typeof v === 'number');
      return { enum: vals };
    }

    case 'ZodArray': {
      const inner = def['type'] as z.ZodTypeAny;
      const minLength = def['minLength'] as { value: number } | null;
      const maxLength = def['maxLength'] as { value: number } | null;
      return {
        type: 'array',
        items: zodTypeToJsonSchema(inner, next),
        ...(minLength !== null && minLength !== undefined ? { minItems: minLength.value } : {}),
        ...(maxLength !== null && maxLength !== undefined ? { maxItems: maxLength.value } : {}),
      };
    }

    case 'ZodObject': {
      const shape = (def['shape'] as () => Record<string, z.ZodTypeAny>)();
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, fieldSchema] of Object.entries(shape)) {
        const fieldDef = fieldSchema._def as Record<string, unknown>;
        const isOptional = fieldDef['typeName'] === 'ZodOptional';
        properties[key] = zodTypeToJsonSchema(fieldSchema, next);
        if (!isOptional) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }

    case 'ZodRecord': {
      const valueType = def['valueType'] as z.ZodTypeAny;
      return {
        type: 'object',
        additionalProperties: zodTypeToJsonSchema(valueType, next),
      };
    }

    case 'ZodOptional': {
      const inner = def['innerType'] as z.ZodTypeAny;
      return zodTypeToJsonSchema(inner, next);
    }

    case 'ZodNullable': {
      const inner = def['innerType'] as z.ZodTypeAny;
      const innerSchema = zodTypeToJsonSchema(inner, next);
      return { anyOf: [innerSchema, { type: 'null' }] };
    }

    case 'ZodUnion': {
      const options = def['options'] as z.ZodTypeAny[];
      return { anyOf: options.map(o => zodTypeToJsonSchema(o, next)) };
    }

    case 'ZodDiscriminatedUnion': {
      const options = def['options'] as z.ZodTypeAny[];
      return { oneOf: options.map(o => zodTypeToJsonSchema(o, next)) };
    }

    case 'ZodIntersection': {
      const left = def['left'] as z.ZodTypeAny;
      const right = def['right'] as z.ZodTypeAny;
      return { allOf: [zodTypeToJsonSchema(left, next), zodTypeToJsonSchema(right, next)] };
    }

    case 'ZodDefault': {
      const inner = def['innerType'] as z.ZodTypeAny;
      const defaultValue = def['defaultValue'] as () => unknown;
      return { ...zodTypeToJsonSchema(inner, next), default: defaultValue() };
    }

    case 'ZodBranded': {
      const inner = def['type'] as z.ZodTypeAny;
      return zodTypeToJsonSchema(inner, next);
    }

    case 'ZodEffects': {
      const inner = def['schema'] as z.ZodTypeAny;
      return zodTypeToJsonSchema(inner, next);
    }

    case 'ZodAny':
    case 'ZodUnknown':
      return {};

    case 'ZodDate':
      return { type: 'string', format: 'date-time' };

    case 'ZodTuple': {
      const items = def['items'] as z.ZodTypeAny[];
      return {
        type: 'array',
        items: { anyOf: items.map(i => zodTypeToJsonSchema(i, next)) },
        minItems: items.length,
        maxItems: items.length,
      };
    }

    default:
      return {};
  }
}

export function zodToJsonSchema(schema: z.ZodTypeAny, options?: ConversionOptions): JsonSchema {
  return zodTypeToJsonSchema(schema, options);
}

export function zodToSchemaWithDescription(
  schema: z.ZodTypeAny,
  description?: string,
  options?: ConversionOptions
): JsonSchema {
  const base = zodToJsonSchema(schema, options);
  const desc = description ?? schema.description;
  return desc !== undefined ? { ...base, description: desc } : base;
}
