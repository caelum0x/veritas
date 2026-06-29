// Extracts request/response examples from OpenAPI operation objects.

import type { OpenApiDocument, OperationObject, HttpMethod } from "@veritas/openapi-gen";
import type { ExtractedExample, ResponseExample } from "./types.js";
import { ExampleExtractionError } from "./errors.js";
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";

const HTTP_METHODS: readonly HttpMethod[] = [
  "get", "post", "put", "patch", "delete", "head", "options", "trace",
];

function extractResponseExamples(
  operation: OperationObject,
  operationId: string,
): readonly ResponseExample[] {
  const examples: ResponseExample[] = [];

  for (const [statusCode, response] of Object.entries(operation.responses)) {
    if (!response.content) continue;
    for (const [contentType, mediaType] of Object.entries(response.content)) {
      if (mediaType.example !== undefined) {
        examples.push({
          statusCode,
          contentType,
          value: mediaType.example,
          summary: response.description,
        });
      } else if (mediaType.examples) {
        for (const [, namedExample] of Object.entries(mediaType.examples)) {
          examples.push({
            statusCode,
            contentType,
            value: namedExample.value,
            summary: namedExample.summary ?? response.description,
          });
        }
      } else if (mediaType.schema) {
        const synthetic = buildSyntheticExample(mediaType.schema, operationId, statusCode);
        if (synthetic !== undefined) {
          examples.push({
            statusCode,
            contentType,
            value: synthetic,
            summary: response.description,
          });
        }
      }
    }
  }

  return examples;
}

function buildSyntheticExample(schema: unknown, _operationId: string, _statusCode: string): unknown {
  if (!schema || typeof schema !== "object") return undefined;
  const s = schema as Record<string, unknown>;

  if (s["example"] !== undefined) return s["example"];
  if (Array.isArray(s["examples"]) && s["examples"].length > 0) return s["examples"][0];

  const type = s["type"];
  if (type === "object" && s["properties"] && typeof s["properties"] === "object") {
    const props = s["properties"] as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, propSchema] of Object.entries(props)) {
      result[key] = buildSyntheticExample(propSchema, _operationId, _statusCode);
    }
    return result;
  }
  if (type === "array") {
    const items = buildSyntheticExample(s["items"], _operationId, _statusCode);
    return items !== undefined ? [items] : [];
  }
  if (type === "string") {
    const enumValues = s["enum"];
    return Array.isArray(enumValues) && enumValues.length > 0 ? enumValues[0] : "string";
  }
  if (type === "integer" || type === "number") return 0;
  if (type === "boolean") return false;

  return undefined;
}

function extractRequestExample(operation: OperationObject): unknown {
  if (!operation.requestBody?.content) return undefined;
  for (const [, mediaType] of Object.entries(operation.requestBody.content)) {
    if (mediaType.example !== undefined) return mediaType.example;
    if (mediaType.examples) {
      const first = Object.values(mediaType.examples)[0];
      if (first) return first.value;
    }
    if (mediaType.schema) {
      return buildSyntheticExample(mediaType.schema, "", "");
    }
  }
  return undefined;
}

export function extractExamples(
  document: OpenApiDocument,
): Result<readonly ExtractedExample[], ExampleExtractionError> {
  const examples: ExtractedExample[] = [];

  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as OperationObject | undefined;
      if (!operation) continue;

      const operationId = operation.operationId ?? `${method}:${path}`;

      try {
        const requestExample = extractRequestExample(operation);
        const responseExamples = extractResponseExamples(operation, operationId);

        examples.push({
          operationId,
          method,
          path,
          requestExample,
          responseExamples,
          description: operation.description ?? operation.summary,
        });
      } catch (e) {
        return err(
          new ExampleExtractionError(operationId, e instanceof Error ? e.message : String(e)),
        );
      }
    }
  }

  return ok(examples);
}

export function extractExampleForOperation(
  document: OpenApiDocument,
  operationId: string,
): Result<ExtractedExample, ExampleExtractionError> {
  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as OperationObject | undefined;
      if (!operation) continue;
      if (operation.operationId !== operationId) continue;

      try {
        const requestExample = extractRequestExample(operation);
        const responseExamples = extractResponseExamples(operation, operationId);
        return ok({
          operationId,
          method,
          path,
          requestExample,
          responseExamples,
          description: operation.description ?? operation.summary,
        });
      } catch (e) {
        return err(
          new ExampleExtractionError(operationId, e instanceof Error ? e.message : String(e)),
        );
      }
    }
  }

  return err(new ExampleExtractionError(operationId, "Operation not found in document"));
}
