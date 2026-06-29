// Field and record generalization — replaces specific values with broader categories
import { type Result, ok, err, isOk } from "@veritas/core";
import { type GeneralizationRule, type DataRecord } from "./types.js";
import { PrivacyConfigError } from "./errors.js";

function generalizeRange(value: unknown, bucketSize: number): string {
  if (typeof value !== "number") {
    return String(value);
  }
  const lower = Math.floor(value / bucketSize) * bucketSize;
  const upper = lower + bucketSize - 1;
  return `${lower}-${upper}`;
}

function generalizeCategory(value: unknown, mapping: Readonly<Record<string, string>>): string {
  const key = String(value);
  return mapping[key] ?? key;
}

function generalizeTruncate(value: unknown, length: number): string {
  const str = String(value);
  if (str.length <= length) return str;
  return str.slice(0, length);
}

function generalizeMask(value: unknown, length: number): string {
  const str = String(value);
  const visibleLength = typeof length === "number" && length > 0 ? length : 0;
  const visible = str.slice(0, visibleLength);
  const masked = "*".repeat(Math.max(0, str.length - visibleLength));
  return visible + masked;
}

/** Apply a single generalization rule to a field value. */
export function generalizeField(
  value: unknown,
  rule: GeneralizationRule,
): Result<unknown, PrivacyConfigError> {
  switch (rule.type) {
    case "range": {
      const bucketSize = rule.parameter ?? 10;
      if (bucketSize <= 0) {
        return err(new PrivacyConfigError({ message: `Range bucket size must be positive for field "${rule.field}"` }));
      }
      return ok(generalizeRange(value, bucketSize));
    }
    case "category": {
      const mapping = rule.mapping ?? {};
      return ok(generalizeCategory(value, mapping));
    }
    case "truncate": {
      const length = rule.parameter ?? 3;
      if (length < 0) {
        return err(new PrivacyConfigError({ message: `Truncate length must be non-negative for field "${rule.field}"` }));
      }
      return ok(generalizeTruncate(value, length));
    }
    case "mask": {
      const visibleLength = rule.parameter ?? 0;
      return ok(generalizeMask(value, visibleLength));
    }
    default: {
      return err(new PrivacyConfigError({ message: `Unknown generalization type for field "${rule.field}"` }));
    }
  }
}

/** Apply generalization rules to a data record, returning a new immutable record. */
export function generalizeRecord(
  record: DataRecord,
  rules: readonly GeneralizationRule[],
): Result<DataRecord, PrivacyConfigError> {
  const ruleMap = new Map<string, GeneralizationRule>();
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
    const generalized = generalizeField(value, rule);
    if (generalized.ok === false) {
      return err(generalized.error as PrivacyConfigError);
    }
    result[key] = generalized.value;
  }

  return ok(Object.freeze(result) as DataRecord);
}

/**
 * Apply a single generalization rule to a record (simple form used by anonymize pipeline).
 * Returns a new record with the target field generalized; falls back to original value on error.
 */
export function generalize(record: DataRecord, rule: GeneralizationRule): DataRecord {
  const value = record[rule.field];
  if (value === undefined) return record;
  const result = generalizeField(value, rule);
  if (isOk(result)) {
    return Object.freeze({ ...record, [rule.field]: result.value }) as DataRecord;
  }
  return record;
}
