// k-anonymity check: verifies each equivalence class has ≥ k records.
import { ok, err, type Result } from "@veritas/core";
import { type DataRecord, type KAnonymityConfig, KAnonymityConfigSchema } from "./types.js";
import { KAnonymityViolationError } from "./errors.js";

/** Build a composite key from a record's quasi-identifier fields. */
function equivalenceKey(record: DataRecord, quasiIdentifiers: ReadonlyArray<string>): string {
  return quasiIdentifiers
    .map((qi) => `${qi}=${JSON.stringify(record[qi] ?? null)}`)
    .join("|");
}

/**
 * Check whether the dataset satisfies k-anonymity for the given quasi-identifiers.
 * Returns the equivalence class sizes or an error listing violating keys.
 */
export function checkKAnonymity(
  dataset: ReadonlyArray<DataRecord>,
  config: KAnonymityConfig
): Result<ReadonlyMap<string, number>, KAnonymityViolationError> {
  const { k, quasiIdentifiers } = KAnonymityConfigSchema.parse(config);

  const counts = new Map<string, number>();
  for (const record of dataset) {
    const key = equivalenceKey(record, quasiIdentifiers);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const violations: string[] = [];
  for (const [key, count] of counts) {
    if (count < k) {
      violations.push(`"${key}" has ${count} records (< k=${k})`);
    }
  }

  if (violations.length > 0) {
    return err(
      new KAnonymityViolationError({
        message: `k-anonymity violation(s): ${violations.slice(0, 3).join("; ")}`,
      })
    );
  }

  return ok(counts);
}

/** Partition dataset into equivalence classes keyed by quasi-identifier values. */
export function groupByEquivalenceClass(
  dataset: ReadonlyArray<DataRecord>,
  quasiIdentifiers: ReadonlyArray<string>
): ReadonlyMap<string, ReadonlyArray<DataRecord>> {
  const groups = new Map<string, DataRecord[]>();
  for (const record of dataset) {
    const key = equivalenceKey(record, quasiIdentifiers);
    const bucket = groups.get(key);
    if (bucket !== undefined) {
      bucket.push(record);
    } else {
      groups.set(key, [record]);
    }
  }
  return groups as ReadonlyMap<string, ReadonlyArray<DataRecord>>;
}

/**
 * Suppress equivalence classes with fewer than k records.
 * Returns a new dataset with violating records removed.
 */
export function enforceKAnonymity(
  dataset: ReadonlyArray<DataRecord>,
  config: KAnonymityConfig
): ReadonlyArray<DataRecord> {
  const { k, quasiIdentifiers } = KAnonymityConfigSchema.parse(config);
  const groups = groupByEquivalenceClass(dataset, quasiIdentifiers);
  const result: DataRecord[] = [];
  for (const records of groups.values()) {
    if (records.length >= k) {
      result.push(...records);
    }
  }
  return result;
}
