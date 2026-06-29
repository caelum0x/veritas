// Serialize an OpenApiDocument to a JSON string or a structured YAML-like string representation.
import type { OpenApiDocument } from "./types.js";
import { SerializationError } from "./errors.js";

export type SerializeFormat = "json" | "yaml";

export interface SerializeOptions {
  readonly format?: SerializeFormat;
  readonly pretty?: boolean;
  readonly indent?: number;
}

/** Serialize an OpenAPI document to a JSON string. */
export function serializeToJson(
  doc: OpenApiDocument,
  options: Pick<SerializeOptions, "pretty" | "indent"> = {},
): string {
  const indent = options.pretty !== false ? (options.indent ?? 2) : undefined;
  try {
    return JSON.stringify(doc, null, indent);
  } catch (cause: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    throw new SerializationError("json", msg);
  }
}

/** Convert a value to a YAML-like string representation (no external deps). */
function valueToYaml(value: unknown, depth: number, indent: number): string {
  const pad = " ".repeat(depth * indent);
  const childPad = " ".repeat((depth + 1) * indent);

  if (value === null) return "null";
  if (value === undefined) return "~";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);

  if (typeof value === "string") {
    // Quote strings that need it
    if (
      value === "" ||
      /[\n\r\t:#{}&*\[\],|>'"@`%]/.test(value) ||
      /^\s|\s$/.test(value) ||
      value === "true" ||
      value === "false" ||
      value === "null" ||
      /^\d/.test(value)
    ) {
      return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => `\n${pad}- ${valueToYaml(item, depth + 1, indent)}`)
      .join("");
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    );
    if (entries.length === 0) return "{}";
    return entries
      .map(([k, v]) => {
        const val = valueToYaml(v, depth + 1, indent);
        // Multiline or object/array values go on next line
        if (
          typeof v === "object" &&
          v !== null &&
          !Array.isArray(v) &&
          Object.keys(v as object).length > 0
        ) {
          return `\n${pad}${k}:${val}`;
        }
        if (Array.isArray(v) && v.length > 0) {
          return `\n${pad}${k}:${val}`;
        }
        return `\n${pad}${k}: ${val}`;
      })
      .join("");
  }

  return String(value);
}

/** Serialize an OpenAPI document to a YAML string (no external deps, strings only). */
export function serializeToYaml(doc: OpenApiDocument, indentSize = 2): string {
  try {
    const body = valueToYaml(doc, 0, indentSize).trimStart();
    return body;
  } catch (cause: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    throw new SerializationError("yaml", msg);
  }
}

/** Serialize an OpenAPI document to JSON or YAML based on options. */
export function serialize(doc: OpenApiDocument, options: SerializeOptions = {}): string {
  const format = options.format ?? "json";
  if (format === "yaml") {
    return serializeToYaml(doc, options.indent ?? 2);
  }
  return serializeToJson(doc, options);
}
