// Evaluation context: carries subject, resource, action, and environment attributes.
import type { JsonValue } from '@veritas/core';

export type AttributeMap = Readonly<Record<string, JsonValue>>;

export interface Subject {
  readonly id: string;
  readonly type: string;
  readonly attributes: AttributeMap;
}

export interface Resource {
  readonly id: string;
  readonly type: string;
  readonly attributes: AttributeMap;
}

export interface EvalContext {
  readonly subject: Subject;
  readonly resource: Resource;
  readonly action: string;
  readonly environment: AttributeMap;
  readonly requestedAt: string;
}

export interface EvalContextInit {
  readonly subject: Subject;
  readonly resource: Resource;
  readonly action: string;
  readonly environment?: AttributeMap;
}

export function makeContext(init: EvalContextInit): EvalContext {
  return {
    subject: init.subject,
    resource: init.resource,
    action: init.action,
    environment: init.environment ?? {},
    requestedAt: new Date().toISOString(),
  };
}

export function makeSubject(
  id: string,
  type: string,
  attributes: AttributeMap = {},
): Subject {
  return { id, type, attributes };
}

export function makeResource(
  id: string,
  type: string,
  attributes: AttributeMap = {},
): Resource {
  return { id, type, attributes };
}

export function getSubjectAttr(ctx: EvalContext, key: string): JsonValue | undefined {
  return ctx.subject.attributes[key];
}

export function getResourceAttr(ctx: EvalContext, key: string): JsonValue | undefined {
  return ctx.resource.attributes[key];
}

export function getEnvAttr(ctx: EvalContext, key: string): JsonValue | undefined {
  return ctx.environment[key];
}

export function withEnvironment(ctx: EvalContext, extra: AttributeMap): EvalContext {
  return { ...ctx, environment: { ...ctx.environment, ...extra } };
}
