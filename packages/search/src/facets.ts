// Facet aggregation — computes field-value bucket counts over a result set
import type { IndexedDocument } from "./document.js";

export interface FacetBucket {
  readonly value: string;
  readonly count: number;
}

export interface FacetResult {
  readonly field: string;
  readonly buckets: readonly FacetBucket[];
}

export interface FacetRequest {
  readonly field: string;
  readonly limit?: number;
}

function extractFacetValues(doc: IndexedDocument, field: string): readonly string[] {
  const raw = doc.fields[field] ?? (doc.meta?.[field]);
  if (raw === undefined || raw === null) return [];
  if (typeof raw === "string") return [raw];
  if (typeof raw === "number" || typeof raw === "boolean") return [String(raw)];
  if (Array.isArray(raw)) {
    return raw.flatMap((v) => {
      if (typeof v === "string") return [v];
      if (typeof v === "number" || typeof v === "boolean") return [String(v)];
      return [];
    });
  }
  return [];
}

export function aggregateFacets(
  docs: readonly IndexedDocument[],
  requests: readonly FacetRequest[]
): readonly FacetResult[] {
  return requests.map((req) => {
    const counts = new Map<string, number>();
    for (const doc of docs) {
      const values = extractFacetValues(doc, req.field);
      for (const value of values) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    const sorted = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

    const limit = req.limit ?? 10;
    return Object.freeze({
      field: req.field,
      buckets: Object.freeze(sorted.slice(0, limit)),
    });
  });
}

export function mergeFacets(
  a: readonly FacetResult[],
  b: readonly FacetResult[]
): readonly FacetResult[] {
  const map = new Map<string, Map<string, number>>();
  for (const result of [...a, ...b]) {
    const fieldMap = map.get(result.field) ?? new Map<string, number>();
    for (const bucket of result.buckets) {
      fieldMap.set(bucket.value, (fieldMap.get(bucket.value) ?? 0) + bucket.count);
    }
    map.set(result.field, fieldMap);
  }
  return [...map.entries()].map(([field, counts]) => ({
    field,
    buckets: [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((x, y) => y.count - x.count),
  }));
}
