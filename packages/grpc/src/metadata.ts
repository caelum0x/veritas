// gRPC metadata — typed key/value pairs sent alongside RPC calls
export type MetadataValue = string | Uint8Array;

export interface GrpcMetadata {
  readonly entries: Readonly<Record<string, ReadonlyArray<MetadataValue>>>;
}

export function emptyMetadata(): GrpcMetadata {
  return Object.freeze({ entries: Object.freeze({}) });
}

export function makeMetadata(
  pairs: Readonly<Record<string, MetadataValue | ReadonlyArray<MetadataValue>>>,
): GrpcMetadata {
  const entries: Record<string, ReadonlyArray<MetadataValue>> = {};
  for (const [key, value] of Object.entries(pairs)) {
    entries[key.toLowerCase()] = Array.isArray(value)
      ? Object.freeze([...(value as ReadonlyArray<MetadataValue>)])
      : Object.freeze([value as MetadataValue]);
  }
  return Object.freeze({ entries: Object.freeze(entries) });
}

export function getMetadataValue(
  meta: GrpcMetadata,
  key: string,
): MetadataValue | undefined {
  return meta.entries[key.toLowerCase()]?.[0];
}

export function getAllMetadataValues(
  meta: GrpcMetadata,
  key: string,
): ReadonlyArray<MetadataValue> {
  return meta.entries[key.toLowerCase()] ?? [];
}

export function mergeMetadata(
  base: GrpcMetadata,
  override: GrpcMetadata,
): GrpcMetadata {
  const merged: Record<string, ReadonlyArray<MetadataValue>> = {
    ...base.entries,
    ...override.entries,
  };
  return Object.freeze({ entries: Object.freeze(merged) });
}

export function appendMetadata(
  meta: GrpcMetadata,
  key: string,
  value: MetadataValue,
): GrpcMetadata {
  const norm = key.toLowerCase();
  const existing = meta.entries[norm] ?? [];
  return Object.freeze({
    entries: Object.freeze({
      ...meta.entries,
      [norm]: Object.freeze([...existing, value]),
    }),
  });
}

export function metadataToHeaders(meta: GrpcMetadata): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {};
  for (const [key, values] of Object.entries(meta.entries)) {
    const first = values[0];
    if (first !== undefined) {
      headers[key] = typeof first === 'string' ? first : Buffer.from(first).toString('base64');
    }
  }
  return Object.freeze(headers);
}

export function headersToMetadata(headers: Readonly<Record<string, string>>): GrpcMetadata {
  const entries: Record<string, ReadonlyArray<MetadataValue>> = {};
  for (const [key, value] of Object.entries(headers)) {
    entries[key.toLowerCase()] = Object.freeze([value]);
  }
  return Object.freeze({ entries: Object.freeze(entries) });
}
