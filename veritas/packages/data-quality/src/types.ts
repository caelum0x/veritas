// Shared types and enums for the data-quality package.
import { z } from "zod";

export const QualityDimensionSchema = z.enum([
  "completeness",
  "uniqueness",
  "validity",
  "freshness",
  "accuracy",
  "consistency",
  "anomaly",
]);
export type QualityDimension = z.infer<typeof QualityDimensionSchema>;

export const CheckSeveritySchema = z.enum(["critical", "high", "medium", "low", "info"]);
export type CheckSeverity = z.infer<typeof CheckSeveritySchema>;

export const RuleTypeSchema = z.enum([
  "not_null",
  "unique",
  "regex",
  "range",
  "enum",
  "custom",
  "freshness",
  "anomaly",
]);
export type RuleType = z.infer<typeof RuleTypeSchema>;

export interface ColumnProfile {
  readonly columnName: string;
  readonly totalCount: number;
  readonly nullCount: number;
  readonly distinctCount: number;
  readonly minValue: unknown;
  readonly maxValue: unknown;
  readonly topValues: ReadonlyArray<{ readonly value: unknown; readonly count: number }>;
  readonly nullRate: number;
  readonly distinctRate: number;
}

export interface DatasetProfile {
  readonly datasetId: string;
  readonly rowCount: number;
  readonly columnCount: number;
  readonly columns: ReadonlyArray<ColumnProfile>;
  readonly profiledAt: string;
}
