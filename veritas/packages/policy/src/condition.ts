// Condition algebra: leaf predicates and boolean combinators over EvalContext
import type { EvalContext } from './context.js';

export type ConditionKind =
  | 'field_eq'
  | 'field_neq'
  | 'field_gt'
  | 'field_gte'
  | 'field_lt'
  | 'field_lte'
  | 'field_in'
  | 'field_contains'
  | 'field_exists'
  | 'and'
  | 'or'
  | 'not'
  | 'always'
  | 'never';

export interface FieldEqCondition {
  readonly kind: 'field_eq';
  readonly field: string;
  readonly value: unknown;
}

export interface FieldNeqCondition {
  readonly kind: 'field_neq';
  readonly field: string;
  readonly value: unknown;
}

export interface FieldGtCondition {
  readonly kind: 'field_gt';
  readonly field: string;
  readonly value: number;
}

export interface FieldGteCondition {
  readonly kind: 'field_gte';
  readonly field: string;
  readonly value: number;
}

export interface FieldLtCondition {
  readonly kind: 'field_lt';
  readonly field: string;
  readonly value: number;
}

export interface FieldLteCondition {
  readonly kind: 'field_lte';
  readonly field: string;
  readonly value: number;
}

export interface FieldInCondition {
  readonly kind: 'field_in';
  readonly field: string;
  readonly values: ReadonlyArray<unknown>;
}

export interface FieldContainsCondition {
  readonly kind: 'field_contains';
  readonly field: string;
  readonly substring: string;
}

export interface FieldExistsCondition {
  readonly kind: 'field_exists';
  readonly field: string;
}

export interface AndCondition {
  readonly kind: 'and';
  readonly conditions: ReadonlyArray<Condition>;
}

export interface OrCondition {
  readonly kind: 'or';
  readonly conditions: ReadonlyArray<Condition>;
}

export interface NotCondition {
  readonly kind: 'not';
  readonly condition: Condition;
}

export interface AlwaysCondition {
  readonly kind: 'always';
}

export interface NeverCondition {
  readonly kind: 'never';
}

export type Condition =
  | FieldEqCondition
  | FieldNeqCondition
  | FieldGtCondition
  | FieldGteCondition
  | FieldLtCondition
  | FieldLteCondition
  | FieldInCondition
  | FieldContainsCondition
  | FieldExistsCondition
  | AndCondition
  | OrCondition
  | NotCondition
  | AlwaysCondition
  | NeverCondition;

function getField(ctx: EvalContext, field: string): unknown {
  // Support scoped lookups: subject.<key>, resource.<key>, env.<key>, else bare key on subject
  if (field.startsWith('subject.')) {
    const key = field.slice(8);
    return ctx.subject.attributes[key];
  }
  if (field.startsWith('resource.')) {
    const key = field.slice(9);
    return ctx.resource.attributes[key];
  }
  if (field.startsWith('env.') || field.startsWith('environment.')) {
    const key = field.startsWith('env.') ? field.slice(4) : field.slice(12);
    return ctx.environment[key];
  }
  // Bare field name: walk nested path on subject attributes
  const parts = field.split('.');
  let current: unknown = ctx.subject.attributes;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function evaluateCondition(condition: Condition, ctx: EvalContext): boolean {
  switch (condition.kind) {
    case 'always':
      return true;
    case 'never':
      return false;
    case 'field_eq': {
      const val = getField(ctx, condition.field);
      return val === condition.value;
    }
    case 'field_neq': {
      const val = getField(ctx, condition.field);
      return val !== condition.value;
    }
    case 'field_gt': {
      const val = getField(ctx, condition.field);
      return typeof val === 'number' && val > condition.value;
    }
    case 'field_gte': {
      const val = getField(ctx, condition.field);
      return typeof val === 'number' && val >= condition.value;
    }
    case 'field_lt': {
      const val = getField(ctx, condition.field);
      return typeof val === 'number' && val < condition.value;
    }
    case 'field_lte': {
      const val = getField(ctx, condition.field);
      return typeof val === 'number' && val <= condition.value;
    }
    case 'field_in': {
      const val = getField(ctx, condition.field);
      return condition.values.includes(val);
    }
    case 'field_contains': {
      const val = getField(ctx, condition.field);
      return typeof val === 'string' && val.includes(condition.substring);
    }
    case 'field_exists': {
      const val = getField(ctx, condition.field);
      return val !== undefined && val !== null;
    }
    case 'and':
      return condition.conditions.every((c) => evaluateCondition(c, ctx));
    case 'or':
      return condition.conditions.some((c) => evaluateCondition(c, ctx));
    case 'not':
      return !evaluateCondition(condition.condition, ctx);
  }
}

// Builders
export const always: AlwaysCondition = { kind: 'always' };
export const never: NeverCondition = { kind: 'never' };

export const fieldEq = (field: string, value: unknown): FieldEqCondition => ({ kind: 'field_eq', field, value });
export const fieldNeq = (field: string, value: unknown): FieldNeqCondition => ({ kind: 'field_neq', field, value });
export const fieldGt = (field: string, value: number): FieldGtCondition => ({ kind: 'field_gt', field, value });
export const fieldGte = (field: string, value: number): FieldGteCondition => ({ kind: 'field_gte', field, value });
export const fieldLt = (field: string, value: number): FieldLtCondition => ({ kind: 'field_lt', field, value });
export const fieldLte = (field: string, value: number): FieldLteCondition => ({ kind: 'field_lte', field, value });
export const fieldIn = (field: string, values: ReadonlyArray<unknown>): FieldInCondition => ({ kind: 'field_in', field, values });
export const fieldContains = (field: string, substring: string): FieldContainsCondition => ({ kind: 'field_contains', field, substring });
export const fieldExists = (field: string): FieldExistsCondition => ({ kind: 'field_exists', field });
export const and = (...conditions: ReadonlyArray<Condition>): AndCondition => ({ kind: 'and', conditions });
export const or = (...conditions: ReadonlyArray<Condition>): OrCondition => ({ kind: 'or', conditions });
export const not = (condition: Condition): NotCondition => ({ kind: 'not', condition });
