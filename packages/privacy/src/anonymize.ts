// Anonymization pipeline — applies suppression, generalization, and noise to records.
import { isOk } from "@veritas/core";
import { type DataRecord, type GeneralizationRule, type SuppressionRule } from "./types.js";
import { suppressRecord } from "./suppression.js";
import { generalizeRecord } from "./generalize.js";
import { laplaceNoise } from "./noise.js";

export interface AnonymizeOptions {
  /** Fields to fully suppress (set to null). */
  readonly suppressFields?: ReadonlyArray<string>;
  /** Generalization rules to apply across matching fields. */
  readonly generalizationRules?: ReadonlyArray<GeneralizationRule>;
  /** Suppression rules to apply to matching fields. */
  readonly suppressionRules?: ReadonlyArray<SuppressionRule>;
  /** Numeric fields to add Laplace noise to, with their sensitivity/epsilon. */
  readonly noiseFields?: ReadonlyArray<{
    readonly field: string;
    readonly sensitivity: number;
    readonly epsilon: number;
  }>;
}

/** Apply anonymization transformations to a single record. Returns a new record. */
export function anonymizeRecord(
  record: DataRecord,
  options: AnonymizeOptions
): DataRecord {
  let result: DataRecord = { ...record };

  // Direct suppression of named fields
  if (options.suppressFields) {
    for (const field of options.suppressFields) {
      result = { ...result, [field]: null };
    }
  }

  // Apply suppression rules (pass all rules at once)
  if (options.suppressionRules && options.suppressionRules.length > 0) {
    const suppressed = suppressRecord(result, options.suppressionRules);
    if (isOk(suppressed)) {
      result = suppressed.value;
    }
  }

  // Apply generalization rules (pass all rules at once)
  if (options.generalizationRules && options.generalizationRules.length > 0) {
    const generalized = generalizeRecord(result, options.generalizationRules);
    if (isOk(generalized)) {
      result = generalized.value;
    }
  }

  // Add Laplace noise to numeric fields
  if (options.noiseFields) {
    for (const { field, sensitivity, epsilon } of options.noiseFields) {
      const raw = result[field];
      if (typeof raw === "number") {
        const noised = laplaceNoise(raw, sensitivity, epsilon);
        if (isOk(noised)) {
          result = { ...result, [field]: noised.value };
        }
      }
    }
  }

  return result;
}

/** Apply anonymization transformations to an entire dataset. */
export function anonymizeDataset(
  dataset: ReadonlyArray<DataRecord>,
  options: AnonymizeOptions
): ReadonlyArray<DataRecord> {
  return dataset.map((record) => anonymizeRecord(record, options));
}
