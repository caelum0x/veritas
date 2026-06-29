// Cache key builder — compose hierarchical cache keys from segments.

const SEPARATOR = ":";

/**
 * Builds a cache key by joining segments with ":" separator.
 * Each segment is coerced to string and invalid (empty) segments are rejected.
 */
export function buildKey(...segments: ReadonlyArray<string | number>): string {
  if (segments.length === 0) throw new Error("Cache key requires at least one segment");
  const parts = segments.map((s) => String(s));
  for (const part of parts) {
    if (part.length === 0) throw new Error("Cache key segments must be non-empty");
  }
  return parts.join(SEPARATOR);
}

/** Prepends a namespace prefix to an existing key. */
export function prefixKey(namespace: string, key: string): string {
  if (namespace.length === 0) throw new Error("Namespace must be non-empty");
  return `${namespace}${SEPARATOR}${key}`;
}

/** Strips a namespace prefix from a key, returning the bare key. */
export function stripPrefix(namespace: string, key: string): string {
  const prefix = `${namespace}${SEPARATOR}`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

/** Returns true if the key belongs to the given namespace. */
export function hasNamespace(namespace: string, key: string): boolean {
  return key.startsWith(`${namespace}${SEPARATOR}`);
}

/**
 * Joins key parts with the ":" separator.
 * Alias for buildKey; accepts an array of parts rather than spread args.
 */
export function joinKeyParts(parts: ReadonlyArray<string | number>): string {
  return buildKey(...parts);
}
