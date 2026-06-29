// schema: derive a JSON Schema object from a Zod schema for use in tool definitions.

import { z } from "zod";

/** Minimal JSON Schema object representation for tool input schemas. */
export interface JsonSchemaObject {
  readonly type: "object";
  readonly properties: Record<string, unknown>;
  readonly required: string[];
  readonly additionalProperties: false;
}

/**
 * Convert a Zod object schema into a plain JSON Schema object.
 * Only handles flat object schemas — nested shapes are emitted as-is via _def.
 */
export function zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape>): JsonSchemaObject {
  const shape = schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    properties[key] = zodFieldToJsonSchema(fieldSchema as z.ZodTypeAny);
    if (!(fieldSchema instanceof z.ZodOptional) && !(fieldSchema instanceof z.ZodDefault)) {
      required.push(key);
    }
  }

  return { type: "object", properties, required, additionalProperties: false };
}

/** Map a single Zod field to its JSON Schema equivalent. */
function zodFieldToJsonSchema(field: z.ZodTypeAny): unknown {
  if (field instanceof z.ZodString) {
    const schema: Record<string, unknown> = { type: "string" };
    if (field.description) schema["description"] = field.description;
    return schema;
  }
  if (field instanceof z.ZodNumber) {
    const schema: Record<string, unknown> = { type: "number" };
    if (field.description) schema["description"] = field.description;
    return schema;
  }
  if (field instanceof z.ZodBoolean) {
    const schema: Record<string, unknown> = { type: "boolean" };
    if (field.description) schema["description"] = field.description;
    return schema;
  }
  if (field instanceof z.ZodArray) {
    return {
      type: "array",
      items: zodFieldToJsonSchema(field.element as z.ZodTypeAny),
      ...(field.description ? { description: field.description } : {}),
    };
  }
  if (field instanceof z.ZodOptional) {
    return zodFieldToJsonSchema(field.unwrap() as z.ZodTypeAny);
  }
  if (field instanceof z.ZodDefault) {
    return zodFieldToJsonSchema(field.removeDefault() as z.ZodTypeAny);
  }
  if (field instanceof z.ZodEnum) {
    return { type: "string", enum: field.options as string[] };
  }
  if (field instanceof z.ZodObject) {
    return zodToJsonSchema(field as z.ZodObject<z.ZodRawShape>);
  }
  // Fallback: emit as string for unsupported types
  return { type: "string" };
}
