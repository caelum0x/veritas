// In-memory join operations (inner, left, right, cross) over RowRecord arrays.
import type { RowRecord } from "@veritas/warehouse";

export type JoinType = "inner" | "left" | "right" | "cross";

export interface JoinCondition {
  readonly leftColumn: string;
  readonly rightColumn: string;
}

export interface JoinSpec {
  readonly type: JoinType;
  readonly left: readonly RowRecord[];
  readonly right: readonly RowRecord[];
  readonly on?: JoinCondition;
  /** Prefix applied to right-side columns to avoid name collisions. */
  readonly rightPrefix?: string;
}

function mergeRows(
  left: RowRecord,
  right: RowRecord | null,
  rightPrefix: string,
): RowRecord {
  const out: Record<string, unknown> = { ...(left as Record<string, unknown>) };
  if (right !== null) {
    for (const [k, v] of Object.entries(right as Record<string, unknown>)) {
      out[`${rightPrefix}${k}`] = v;
    }
  }
  return out as RowRecord;
}

function nullFilled(row: RowRecord, prefix: string): RowRecord {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(row as Record<string, unknown>)) {
    out[`${prefix}${k}`] = null;
  }
  return out as RowRecord;
}

/** Execute an in-memory join and return combined rows. */
export function executeJoin(spec: JoinSpec): readonly RowRecord[] {
  const { type, left, right, on, rightPrefix = "right_" } = spec;

  if (type === "cross") {
    const result: RowRecord[] = [];
    for (const l of left) {
      for (const r of right) {
        result.push(mergeRows(l, r, rightPrefix));
      }
    }
    return result;
  }

  if (!on) return left;

  const { leftColumn, rightColumn } = on;

  // Build a hash map from right side for O(n+m) join.
  const rightMap = new Map<unknown, RowRecord[]>();
  for (const r of right) {
    const key = (r as Record<string, unknown>)[rightColumn];
    const bucket = rightMap.get(key) ?? [];
    bucket.push(r);
    rightMap.set(key, bucket);
  }

  const matchedRightKeys = new Set<unknown>();
  const result: RowRecord[] = [];

  for (const l of left) {
    const key = (l as Record<string, unknown>)[leftColumn];
    const matches = rightMap.get(key) ?? [];

    if (matches.length > 0) {
      for (const r of matches) {
        result.push(mergeRows(l, r, rightPrefix));
      }
      matchedRightKeys.add(key);
    } else if (type === "left") {
      const sample = right[0];
      const empty = sample ? nullFilled(sample, rightPrefix) : {};
      result.push(mergeRows(l, null, rightPrefix));
      // Merge null-filled right columns.
      const withNulls: Record<string, unknown> = {
        ...(result[result.length - 1]! as Record<string, unknown>),
        ...empty,
      };
      result[result.length - 1] = withNulls as RowRecord;
    }
  }

  if (type === "right") {
    // Add right rows that had no left match.
    for (const r of right) {
      const key = (r as Record<string, unknown>)[rightColumn];
      if (!matchedRightKeys.has(key)) {
        const sample = left[0];
        const emptyLeft: Record<string, unknown> = {};
        if (sample) {
          for (const k of Object.keys(sample as Record<string, unknown>)) {
            emptyLeft[k] = null;
          }
        }
        const merged: Record<string, unknown> = {
          ...emptyLeft,
          ...Object.fromEntries(
            Object.entries(r as Record<string, unknown>).map(([k, v]) => [`${rightPrefix}${k}`, v]),
          ),
        };
        result.push(merged as RowRecord);
      }
    }
  }

  return result;
}
