// Immutable array helpers that always return new arrays.

import { isDefined } from "./guards.js";

/** Return a new array with duplicates removed (by ===). */
export function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/** Return a new array with null/undefined removed and the element type narrowed. */
export function compact<T>(items: readonly (T | null | undefined)[]): T[] {
  return items.filter(isDefined);
}

/** Split items into chunks of at most `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new Error(`chunk size must be >= 1, got ${size}`);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Group items into a Map keyed by `keyFn`. */
export function groupBy<T, K>(
  items: readonly T[],
  keyFn: (item: T) => K,
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/** Build a record keyed by `keyFn` (last write wins on collision). */
export function indexBy<T>(
  items: readonly T[],
  keyFn: (item: T) => string,
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) out[keyFn(item)] = item;
  return out;
}
