// Pseudonymization — replaces direct identifiers with consistent pseudonyms.
import { sha256Hex } from "@veritas/core";
import { type DataRecord } from "./types.js";

export interface PseudonymizeOptions {
  /** Fields to pseudonymize. */
  readonly fields: ReadonlyArray<string>;
  /**
   * Salt added before hashing to prevent rainbow-table attacks.
   * Should be a secret kept outside the dataset.
   */
  readonly salt: string;
  /** If true, use a consistent mapping so the same value always maps to the same pseudonym. */
  readonly consistent?: boolean;
}

/** In-memory ephemeral mapping for consistent pseudonymization within a session. */
type PseudonymMap = Map<string, string>;

function buildKey(field: string, value: string, salt: string): string {
  return `${salt}:${field}:${value}`;
}

async function pseudonymValue(
  field: string,
  value: string,
  salt: string
): Promise<string> {
  const key = buildKey(field, value, salt);
  return sha256Hex(key);
}

/**
 * Pseudonymize a single record — replaces identifier fields with SHA-256 hashes.
 * The same plaintext value under the same field+salt always yields the same pseudonym.
 */
export async function pseudonymizeRecord(
  record: DataRecord,
  options: PseudonymizeOptions
): Promise<DataRecord> {
  let result: DataRecord = { ...record };
  for (const field of options.fields) {
    const raw = record[field];
    if (raw !== null && raw !== undefined) {
      const str = typeof raw === "string" ? raw : JSON.stringify(raw);
      result = {
        ...result,
        [field]: await pseudonymValue(field, str, options.salt),
      };
    }
  }
  return result;
}

/**
 * Pseudonymize an entire dataset.
 * When consistent=true (default), maintains an in-memory map so identical values
 * in the same batch always receive the same pseudonym.
 */
export async function pseudonymizeDataset(
  dataset: ReadonlyArray<DataRecord>,
  options: PseudonymizeOptions
): Promise<ReadonlyArray<DataRecord>> {
  const consistent = options.consistent !== false;
  const cache: PseudonymMap = new Map();

  const results: DataRecord[] = [];
  for (const record of dataset) {
    let r: DataRecord = { ...record };
    for (const field of options.fields) {
      const raw = record[field];
      if (raw !== null && raw !== undefined) {
        const str = typeof raw === "string" ? raw : JSON.stringify(raw);
        const cacheKey = consistent ? buildKey(field, str, options.salt) : null;
        let pseudo: string;
        if (cacheKey !== null && cache.has(cacheKey)) {
          pseudo = cache.get(cacheKey) as string;
        } else {
          pseudo = await pseudonymValue(field, str, options.salt);
          if (cacheKey !== null) cache.set(cacheKey, pseudo);
        }
        r = { ...r, [field]: pseudo };
      }
    }
    results.push(r);
  }
  return results;
}
