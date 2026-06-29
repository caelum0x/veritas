// Data profiler: computes statistical profiles of datasets and columns.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { ColumnProfile, DatasetProfile } from "./types.js";

function profileColumn(columnName: string, values: readonly unknown[]): ColumnProfile {
  const totalCount = values.length;
  const nullCount = values.filter((v) => v === null || v === undefined).length;
  const nonNull = values.filter((v) => v !== null && v !== undefined);

  const frequencyMap = new Map<string, number>();
  for (const v of nonNull) {
    const key = JSON.stringify(v);
    frequencyMap.set(key, (frequencyMap.get(key) ?? 0) + 1);
  }
  const distinctCount = frequencyMap.size;

  const topValues = Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([raw, count]) => ({ value: JSON.parse(raw) as unknown, count }));

  const nums = nonNull.filter((v): v is number => typeof v === "number");
  const minValue = nums.length > 0 ? Math.min(...nums) : nonNull[0] ?? null;
  const maxValue = nums.length > 0 ? Math.max(...nums) : nonNull[nonNull.length - 1] ?? null;

  return {
    columnName,
    totalCount,
    nullCount,
    distinctCount,
    minValue,
    maxValue,
    topValues,
    nullRate: totalCount === 0 ? 0 : nullCount / totalCount,
    distinctRate: totalCount === 0 ? 0 : distinctCount / totalCount,
  };
}

export function profileDataset(
  datasetId: string,
  rows: readonly Record<string, unknown>[]
): Result<DatasetProfile> {
  if (rows.length === 0) {
    return ok({
      datasetId,
      rowCount: 0,
      columnCount: 0,
      columns: [],
      profiledAt: new Date().toISOString(),
    });
  }

  const columnNames = Object.keys(rows[0] ?? {});
  const columns = columnNames.map((col) => {
    const values = rows.map((row) => row[col] ?? null);
    return profileColumn(col, values);
  });

  return ok({
    datasetId,
    rowCount: rows.length,
    columnCount: columnNames.length,
    columns,
    profiledAt: new Date().toISOString(),
  });
}

export function getColumnProfile(
  profile: DatasetProfile,
  columnName: string
): Result<ColumnProfile> {
  const col = profile.columns.find((c) => c.columnName === columnName);
  if (!col) {
    return err(new Error(`Column "${columnName}" not found in profile for dataset "${profile.datasetId}"`));
  }
  return ok(col);
}

export function profileColumn_(columnName: string, values: readonly unknown[]): ColumnProfile {
  return profileColumn(columnName, values);
}
