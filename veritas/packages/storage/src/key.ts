// Object key builder — constructs namespaced storage paths from segments.

export interface KeyBuilderOptions {
  readonly prefix?: string;
  readonly separator?: string;
}

export function buildKey(segments: readonly string[], options: KeyBuilderOptions = {}): string {
  const sep = options.separator ?? "/";
  const parts = segments.filter((s) => s.length > 0).map((s) => s.replace(/^\/+|\/+$/g, ""));
  const joined = parts.join(sep);
  return options.prefix ? `${options.prefix}${sep}${joined}` : joined;
}

export function reportKey(orgId: string, reportId: string, suffix?: string): string {
  const base = buildKey(["reports", orgId, reportId]);
  return suffix ? `${base}/${suffix}` : base;
}

export function claimKey(orgId: string, claimId: string, suffix?: string): string {
  const base = buildKey(["claims", orgId, claimId]);
  return suffix ? `${base}/${suffix}` : base;
}

export function artifactKey(kind: string, id: string, filename: string): string {
  return buildKey(["artifacts", kind, id, filename]);
}

export function parseKeySegments(key: string, separator = "/"): readonly string[] {
  return key.split(separator).filter((s) => s.length > 0);
}

export function keyDirectory(key: string, separator = "/"): string {
  const segments = parseKeySegments(key, separator);
  return segments.slice(0, -1).join(separator);
}

export function keyBasename(key: string, separator = "/"): string {
  const segments = parseKeySegments(key, separator);
  return segments[segments.length - 1] ?? "";
}
