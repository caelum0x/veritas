// Uniqueness check: detects duplicate values in dataset columns.
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

function countDuplicates(values: readonly unknown[]): { duplicateCount: number; distinctCount: number } {
  const seen = new Map<string, number>();
  for (const v of values) {
    if (v === null || v === undefined) continue;
    const key = JSON.stringify(v);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const distinctCount = seen.size;
  const duplicateCount = Array.from(seen.values()).filter((c) => c > 1).reduce((acc, c) => acc + (c - 1), 0);
  return { duplicateCount, distinctCount };
}

export class UniquenessCheck implements DataCheck {
  readonly checkId: string;
  readonly ruleName: string;
  readonly dimension = "uniqueness" as const;
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
    const nonNull = values.filter((v) => v !== null && v !== undefined);
    const totalRows = nonNull.length;

    if (totalRows === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, 1, "No non-null rows to check");
    }

    const { duplicateCount, distinctCount } = countDuplicates(nonNull);
    const uniquenessRate = distinctCount / totalRows;
    const score = uniquenessRate;

    if (uniquenessRate >= this.threshold) {
      return passedCheck(
        this.checkId,
        this.ruleName,
        this.dimension,
        this.severity,
        score,
        `Uniqueness ${(uniquenessRate * 100).toFixed(1)}% meets threshold ${(this.threshold * 100).toFixed(1)}%`,
        { uniquenessRate, duplicateCount, distinctCount, threshold: this.threshold }
      );
    }

    return failedCheck(
      this.checkId,
      this.ruleName,
      this.dimension,
      this.severity,
      score,
      `Uniqueness ${(uniquenessRate * 100).toFixed(1)}% below threshold ${(this.threshold * 100).toFixed(1)}%`,
      duplicateCount,
      totalRows,
      { uniquenessRate, duplicateCount, distinctCount, threshold: this.threshold }
    );
  }
}

export function makeUniquenessCheck(rule: RuleConfig): DataCheck {
  return new UniquenessCheck(rule);
}

export function computeUniqueness(values: readonly unknown[]): number {
  const nonNull = values.filter((v) => v !== null && v !== undefined);
  if (nonNull.length === 0) return 1;
  const { distinctCount } = countDuplicates(nonNull);
  return distinctCount / nonNull.length;
}
