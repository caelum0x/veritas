// Classifier: determines the classification level of a value or object based on rules

import { ok, err, type Result } from "@veritas/core";
import { type ClassificationLevel, maxLevel } from "./classification.js";
import { makeLabel, type DataLabel } from "./label.js";
import { InvalidClassificationError } from "./errors.js";

export type ClassificationRule = {
  /** Unique rule identifier. */
  id: string;
  /** Human-readable description. */
  description: string;
  /** Returns the classification level if the rule matches, otherwise undefined. */
  match(fieldName: string, value: unknown): ClassificationLevel | undefined;
};

export type ClassifierConfig = {
  rules: readonly ClassificationRule[];
  /** Fallback level when no rules match. */
  defaultLevel: ClassificationLevel;
  /** Identity to record in labels. */
  classifiedBy: string;
};

export type ClassifiedField = {
  fieldName: string;
  value: unknown;
  label: DataLabel;
  matchedRule: string | null;
};

/** Classify a single field value against the configured rule set. */
export function classifyField(
  config: ClassifierConfig,
  fieldName: string,
  value: unknown,
): Result<ClassifiedField, InvalidClassificationError> {
  try {
    let resolvedLevel: ClassificationLevel = config.defaultLevel;
    let matchedRule: string | null = null;

    for (const rule of config.rules) {
      const level = rule.match(fieldName, value);
      if (level !== undefined) {
        resolvedLevel = matchedRule === null ? level : maxLevel(resolvedLevel, level);
        matchedRule = rule.id;
      }
    }

    const label = makeLabel(fieldName, resolvedLevel, config.classifiedBy);
    return ok({ fieldName, value, label, matchedRule });
  } catch (e) {
    return err(new InvalidClassificationError(`Failed to classify field "${fieldName}": ${String(e)}`));
  }
}

/** Classify all fields of a plain object, returning a map of field → ClassifiedField. */
export function classifyObject(
  config: ClassifierConfig,
  obj: Record<string, unknown>,
): Result<Map<string, ClassifiedField>, InvalidClassificationError> {
  const results = new Map<string, ClassifiedField>();

  for (const [key, value] of Object.entries(obj)) {
    const result = classifyField(config, key, value);
    if (!result.ok) return result as Result<Map<string, ClassifiedField>, InvalidClassificationError>;
    results.set(key, result.value);
  }

  return ok(results);
}

/** Derive the aggregate classification level of an object (highest among all fields). */
export function aggregateLevel(
  classified: Map<string, ClassifiedField>,
): ClassificationLevel {
  let level: ClassificationLevel = "public";
  for (const { label } of classified.values()) {
    level = maxLevel(level, label.level);
  }
  return level;
}
