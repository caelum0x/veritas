// Warehouse query builder and result types.
import { z } from "zod";

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export const FilterOperatorSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "nin",
  "like",
  "isNull",
  "isNotNull",
]);
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const FilterSchema = z.object({
  column: z.string(),
  operator: FilterOperatorSchema,
  value: z.unknown().optional(),
});
export type Filter = z.infer<typeof FilterSchema>;

export const SortSchema = z.object({
  column: z.string(),
  direction: SortDirectionSchema.default("asc"),
});
export type Sort = z.infer<typeof SortSchema>;

export const WarehouseQuerySchema = z.object({
  table: z.string(),
  columns: z.array(z.string()).optional(),
  filters: z.array(FilterSchema).default([]),
  sorts: z.array(SortSchema).default([]),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().default(0),
});
export type WarehouseQuery = z.infer<typeof WarehouseQuerySchema>;

export interface QueryResult {
  readonly rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  readonly total: number;
  readonly durationMs: number;
}

export function applyFilter(
  row: Record<string, unknown>,
  filter: Filter
): boolean {
  const val = row[filter.column];
  const fv = filter.value;
  switch (filter.operator) {
    case "eq":
      return val === fv;
    case "neq":
      return val !== fv;
    case "gt":
      return typeof val === "number" && typeof fv === "number" && val > fv;
    case "gte":
      return typeof val === "number" && typeof fv === "number" && val >= fv;
    case "lt":
      return typeof val === "number" && typeof fv === "number" && val < fv;
    case "lte":
      return typeof val === "number" && typeof fv === "number" && val <= fv;
    case "in":
      return Array.isArray(fv) && fv.includes(val);
    case "nin":
      return Array.isArray(fv) && !fv.includes(val);
    case "like":
      return (
        typeof val === "string" &&
        typeof fv === "string" &&
        val.includes(fv.replace(/%/g, ""))
      );
    case "isNull":
      return val === null || val === undefined;
    case "isNotNull":
      return val !== null && val !== undefined;
  }
}

export function applySort(
  rows: ReadonlyArray<Record<string, unknown>>,
  sorts: Sort[]
): Array<Record<string, unknown>> {
  if (sorts.length === 0) return [...rows];
  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const av = a[sort.column];
      const bv = b[sort.column];
      const dir = sort.direction === "asc" ? 1 : -1;
      if (av === bv) continue;
      if (av === null || av === undefined) return dir;
      if (bv === null || bv === undefined) return -dir;
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    }
    return 0;
  });
}
