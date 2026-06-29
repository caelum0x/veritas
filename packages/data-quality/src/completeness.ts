// Completeness check: measures null/missing value rates in dataset columns.
import { newId } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { DataCheck, CheckResult, CheckContext } from "./check.js";
import { passedCheck, failedCheck, errorCheck } from "./check.js";
import type { RuleConfig } from "./rule.js";

function extractColumnValues(data: readonly unknown[], columnName: string): unknown[] {
  return data.map((row) => {
    if (row !== null && typeof row === "object" && !Array.isArray(row)) {
      return (row as Record<string, unknown>)[columnName] ?? null;
    }
    return null;
  });
}

export class CompletenessCheck implements DataCheck {
  readonly checkId: string;
  readonly ruleName: string;
  readonly dimension = "completeness" as const;
  readonly severity;
  private readonly columnName: string;
  private readonly threshold: number;

  constructor(rule: RuleConfig) {
    this.checkId = rule.id;
    this.ruleName = rule.name;
    this.severity = rule.severity;
    this.columnName = rule.columnName ?? "";
    this.threshold = typeof rule.params?.["threshold"] === "number" ? rule.params["threshold"] : 1.0;
  }

  async run(data: readonly unknown[], ctx: CheckContext): Promise<Result<CheckResult>> {
    if (!this.columnName) {
      return errorCheck(this.checkId, this.ruleName, this.dimension, this.severity, "No column name specified");
    }

    const values = extractColumnValues(data, this.columnName);
    const totalRows = values.length;

    if (totalRows === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, 1, "No rows to check");
    }

    const nullCount = values.filter((v) => v === null || v === undefined).length;
    const presentCount = totalRows - nullCount;
    const completenessRate = presentCount / totalRows;
    const score = completenessRate;

    if (completenessRate >= this.threshold) {
      return passedCheck(
        this.checkId,
        this.ruleName,
        this.dimension,
        this.severity,
        score,
        `Completeness ${(completenessRate * 100).toFixed(1)}% meets threshold ${(this.threshold * 100).toFixed(1)}%`,
        { completenessRate, nullCount, presentCount, threshold: this.threshold }
      );
    }

    return failedCheck(
      this.checkId,
      this.ruleName,
      this.dimension,
      this.severity,
      score,
      `Completeness ${(completenessRate * 100).toFixed(1)}% below threshold ${(this.threshold * 100).toFixed(1)}%`,
      nullCount,
      totalRows,
      { completenessRate, nullCount, presentCount, threshold: this.threshold }
    );
  }
}

export function makeCompletenessCheck(rule: RuleConfig): DataCheck {
  return new CompletenessCheck(rule);
}

export function computeCompleteness(values: readonly unknown[]): number {
  if (values.length === 0) return 1;
  const nullCount = values.filter((v) => v === null || v === undefined).length;
  return (values.length - nullCount) / values.length;
}
