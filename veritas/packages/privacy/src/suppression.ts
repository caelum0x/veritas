// Field and record suppression — removes or replaces sensitive values based on rules
import { type Result, ok, err, isOk } from "@veritas/core";
import { type SuppressionRule, type DataRecord } from "./types.js";
import { PrivacyConfigError } from "./errors.js";

function shouldSuppress(
  value: unknown,
  rule: SuppressionRule,
  fieldCountInDataset?: number,
): boolean {
  switch (rule.condition) {
    case "always":
      return true;
    case "threshold": {
      const threshold = rule.threshold ?? 5;
      const count = fieldCountInDataset ?? 0;
      return count < threshold;
    }
    case "pattern": {
      if (rule.pattern === undefined) return false;
      try {
        const regex = new RegExp(rule.pattern);
        return regex.test(String(value));
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

/** Apply a suppression rule to a single field value. */
export function suppressField(
  value: unknown,
  rule: SuppressionRule,
  fieldCountInDataset?: number,
): Result<unknown, PrivacyConfigError> {
  if (rule.condition === "threshold" && rule.threshold !== undefined && rule.threshold <= 0) {
    return err(new PrivacyConfigError({ message: `Threshold must be positive for field "${rule.field}"` }));
  }

  if (rule.condition === "pattern" && rule.pattern !== undefined) {
    try {
      new RegExp(rule.pattern);
    } catch {
      return err(new PrivacyConfigError({ message: `Invalid regex pattern for field "${rule.field}": ${rule.pattern}` }));
    }
  }

  if (shouldSuppress(value, rule, fieldCountInDataset)) {
    return ok(rule.replacement ?? null);
  }

  return ok(value);
}

/** Apply suppression rules to a data record, returning a new immutable record. */
export function suppressRecord(
  record: DataRecord,
  rules: readonly SuppressionRule[],
  fieldCounts?: Readonly<Record<string, number>>,
): Result<DataRecord, PrivacyConfigError> {
  const ruleMap = new Map<string, SuppressionRule>();
  for (const rule of rules) {
    ruleMap.set(rule.field, rule);
  }

  const result: { [key: string]: unknown } = {};

  for (const [key, value] of Object.entries(record)) {
    const rule = ruleMap.get(key);
    if (rule === undefined) {
      result[key] = value;
      continue;
    }
    const fieldCount = fieldCounts?.[key];
    const suppressed = suppressField(value, rule, fieldCount);
    if (suppressed.ok === false) {
      return err(suppressed.error as PrivacyConfigError);
    }
    result[key] = suppressed.value;
  }

  return ok(Object.freeze(result) as DataRecord);
}

/**
 * Apply a single suppression rule to a record (simple form used by anonymize pipeline).
 * Returns a new record with the target field suppressed; falls back to original record on error.
 */
export function suppress(record: DataRecord, rule: SuppressionRule): DataRecord {
  const value = record[rule.field];
  if (value === undefined) return record;
  const result = suppressField(value, rule);
  if (isOk(result)) {
    return Object.freeze({ ...record, [rule.field]: result.value }) as DataRecord;
  }
  return record;
}
