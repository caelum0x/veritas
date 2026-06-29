// FeatureFlag type definition for the feature-flags package

export type FlagValueType = "boolean" | "string" | "number" | "json";

export interface FlagRule {
  readonly id: string;
  readonly attribute: string;
  readonly operator:
    | "eq"
    | "neq"
    | "in"
    | "nin"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "startsWith"
    | "endsWith";
  readonly values: readonly unknown[];
}

export interface FlagVariant<T = unknown> {
  readonly key: string;
  readonly value: T;
  readonly weight: number; // 0-100, percentage weight for rollout
}

export interface FlagTargetingRule {
  readonly id: string;
  readonly description?: string;
  readonly conditions: readonly FlagRule[];
  readonly serve: string; // variant key
  readonly rolloutPercentage?: number; // 0-100
}

export interface FeatureFlag<T = unknown> {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly enabled: boolean;
  readonly valueType: FlagValueType;
  readonly defaultVariant: string;
  readonly variants: readonly FlagVariant<T>[];
  readonly targetingRules: readonly FlagTargetingRule[];
  readonly tags?: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FlagEvaluationResult<T = unknown> {
  readonly flagKey: string;
  readonly value: T;
  readonly variantKey: string;
  readonly reason:
    | "DEFAULT"
    | "TARGETING_MATCH"
    | "ROLLOUT"
    | "OVERRIDE"
    | "DISABLED"
    | "ERROR";
  readonly ruleId?: string;
}
