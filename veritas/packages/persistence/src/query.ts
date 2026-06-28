// Filter, sort, and pagination query types used across all repositories.
import type { PageRequest } from "@veritas/core";

/** Comparison operators for filter expressions. */
export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "like"
  | "ilike"
  | "isNull"
  | "isNotNull";

/** A single filter condition on a field. */
export interface FilterCondition<T> {
  readonly field: keyof T;
  readonly operator: FilterOperator;
  readonly value?: unknown;
}

/** Logical combination of filter conditions. */
export interface FilterGroup<T> {
  readonly and?: ReadonlyArray<FilterCondition<T> | FilterGroup<T>>;
  readonly or?: ReadonlyArray<FilterCondition<T> | FilterGroup<T>>;
}

/** Sort direction. */
export type SortDirection = "asc" | "desc";

/** A single sort clause. */
export interface SortClause<T> {
  readonly field: keyof T;
  readonly direction: SortDirection;
}

/** Full query options combining filter, sort, and pagination. */
export interface QueryOptions<T> {
  readonly filter?: FilterGroup<T>;
  readonly sort?: ReadonlyArray<SortClause<T>>;
  readonly page?: PageRequest;
}

/** Evaluate a single filter condition against a row value. */
function evalCondition<T>(row: T, cond: FilterCondition<T>): boolean {
  const rowVal = row[cond.field];
  switch (cond.operator) {
    case "eq":
      return rowVal === cond.value;
    case "neq":
      return rowVal !== cond.value;
    case "gt":
      return (rowVal as number) > (cond.value as number);
    case "gte":
      return (rowVal as number) >= (cond.value as number);
    case "lt":
      return (rowVal as number) < (cond.value as number);
    case "lte":
      return (rowVal as number) <= (cond.value as number);
    case "in":
      return Array.isArray(cond.value) && cond.value.includes(rowVal);
    case "nin":
      return Array.isArray(cond.value) && !cond.value.includes(rowVal);
    case "like":
      return typeof rowVal === "string" &&
        typeof cond.value === "string" &&
        rowVal.includes(cond.value);
    case "ilike":
      return typeof rowVal === "string" &&
        typeof cond.value === "string" &&
        rowVal.toLowerCase().includes(cond.value.toLowerCase());
    case "isNull":
      return rowVal === null || rowVal === undefined;
    case "isNotNull":
      return rowVal !== null && rowVal !== undefined;
    default:
      return true;
  }
}

/** Recursively evaluate a filter group against a row. */
export function evalFilter<T>(row: T, group: FilterGroup<T>): boolean {
  if (group.and) {
    return group.and.every((c) =>
      "field" in c ? evalCondition(row, c as FilterCondition<T>) : evalFilter(row, c as FilterGroup<T>)
    );
  }
  if (group.or) {
    return group.or.some((c) =>
      "field" in c ? evalCondition(row, c as FilterCondition<T>) : evalFilter(row, c as FilterGroup<T>)
    );
  }
  return true;
}

/** Apply sort clauses to a mutable copy of an array. */
export function applySort<T>(rows: T[], sort: ReadonlyArray<SortClause<T>>): T[] {
  return [...rows].sort((a, b) => {
    for (const clause of sort) {
      const av = a[clause.field];
      const bv = b[clause.field];
      if (av === bv) continue;
      const cmp = av < bv ? -1 : 1;
      return clause.direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}
