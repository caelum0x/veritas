// Immutable object helpers (no in-place mutation).

/** Return a new object containing only the given keys. */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) out[key] = obj[key];
  }
  return out;
}

/** Return a new object excluding the given keys. */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> {
  const drop = new Set<PropertyKey>(keys);
  const out: Record<PropertyKey, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!drop.has(k)) out[k] = v;
  }
  return out as Omit<T, K>;
}

/** Shallow-merge `patch` over `base`, returning a new object. */
export function mergeShallow<T extends object>(base: T, patch: Partial<T>): T {
  return { ...base, ...patch };
}

/** Map an object's values to a new object, preserving keys. */
export function mapValues<T extends object, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U,
): Record<keyof T, U> {
  const out = {} as Record<keyof T, U>;
  for (const key of Object.keys(obj) as (keyof T)[]) {
    out[key] = fn(obj[key], key);
  }
  return out;
}
