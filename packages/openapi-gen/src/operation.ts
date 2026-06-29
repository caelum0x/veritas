// Operation builder for OpenAPI operation objects

import { z } from 'zod';
import type {
  Operation,
  Parameter,
  RequestBody,
  Response,
  SecurityRequirement,
  ExternalDocs,
  MediaType,
} from './document.js';
import { zodToJsonSchema } from './zod-to-schema.js';

export interface OperationBuilder {
  operationId(id: string): OperationBuilder;
  summary(s: string): OperationBuilder;
  description(d: string): OperationBuilder;
  tag(t: string): OperationBuilder;
  tags(ts: readonly string[]): OperationBuilder;
  parameter(p: Parameter): OperationBuilder;
  parameters(ps: readonly Parameter[]): OperationBuilder;
  body(schema: z.ZodTypeAny, description?: string, required?: boolean): OperationBuilder;
  rawBody(body: RequestBody): OperationBuilder;
  response(statusCode: string | number, response: Response): OperationBuilder;
  security(req: SecurityRequirement): OperationBuilder;
  noSecurity(): OperationBuilder;
  deprecated(flag?: boolean): OperationBuilder;
  externalDocs(docs: ExternalDocs): OperationBuilder;
  build(): Operation;
}

interface MutableOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
  externalDocs?: ExternalDocs;
}

function cloneOp(op: MutableOperation): MutableOperation {
  return {
    ...op,
    tags: [...op.tags],
    parameters: [...op.parameters],
    responses: { ...op.responses },
    security: op.security !== undefined ? [...op.security] : undefined,
  };
}

function createOperationBuilder(initial: MutableOperation): OperationBuilder {
  const self: OperationBuilder = {
    operationId(id) {
      return createOperationBuilder({ ...cloneOp(initial), operationId: id });
    },
    summary(s) {
      return createOperationBuilder({ ...cloneOp(initial), summary: s });
    },
    description(d) {
      return createOperationBuilder({ ...cloneOp(initial), description: d });
    },
    tag(t) {
      const op = cloneOp(initial);
      op.tags.push(t);
      return createOperationBuilder(op);
    },
    tags(ts) {
      const op = cloneOp(initial);
      op.tags.push(...ts);
      return createOperationBuilder(op);
    },
    parameter(p) {
      const op = cloneOp(initial);
      op.parameters.push(p);
      return createOperationBuilder(op);
    },
    parameters(ps) {
      const op = cloneOp(initial);
      op.parameters.push(...ps);
      return createOperationBuilder(op);
    },
    body(schema, description, required = true) {
      const jsonSchema = zodToJsonSchema(schema);
      const mediaType: MediaType = { schema: jsonSchema };
      const requestBody: RequestBody = {
        content: { 'application/json': mediaType },
        required,
        ...(description !== undefined ? { description } : {}),
      };
      return createOperationBuilder({ ...cloneOp(initial), requestBody });
    },
    rawBody(body) {
      return createOperationBuilder({ ...cloneOp(initial), requestBody: body });
    },
    response(statusCode, response) {
      const op = cloneOp(initial);
      op.responses[String(statusCode)] = response;
      return createOperationBuilder(op);
    },
    security(req) {
      const op = cloneOp(initial);
      op.security = [...(op.security ?? []), req];
      return createOperationBuilder(op);
    },
    noSecurity() {
      return createOperationBuilder({ ...cloneOp(initial), security: [] });
    },
    deprecated(flag = true) {
      return createOperationBuilder({ ...cloneOp(initial), deprecated: flag });
    },
    externalDocs(docs) {
      return createOperationBuilder({ ...cloneOp(initial), externalDocs: docs });
    },
    build(): Operation {
      const op = initial;
      return Object.freeze({
        ...(op.operationId !== undefined ? { operationId: op.operationId } : {}),
        ...(op.summary !== undefined ? { summary: op.summary } : {}),
        ...(op.description !== undefined ? { description: op.description } : {}),
        ...(op.tags.length > 0 ? { tags: op.tags } : {}),
        ...(op.parameters.length > 0 ? { parameters: op.parameters } : {}),
        ...(op.requestBody !== undefined ? { requestBody: op.requestBody } : {}),
        responses: op.responses,
        ...(op.security !== undefined ? { security: op.security } : {}),
        ...(op.deprecated === true ? { deprecated: true } : {}),
        ...(op.externalDocs !== undefined ? { externalDocs: op.externalDocs } : {}),
      });
    },
  };

  return self;
}

export function operation(): OperationBuilder {
  return createOperationBuilder({
    tags: [],
    parameters: [],
    responses: {},
  });
}

export function jsonResponse(description: string, schema?: z.ZodTypeAny): Response {
  if (schema === undefined) {
    return { description };
  }
  const mediaType: MediaType = { schema: zodToJsonSchema(schema) };
  return { description, content: { 'application/json': mediaType } };
}

export function emptyResponse(description: string): Response {
  return { description };
}
