// Query binding: links dashboard widgets to query-engine SelectQuery definitions.
import { z } from "zod";
import { ok, err, Result } from "@veritas/core";
import type { SelectQuery } from "@veritas/query-engine";
import { FilterBindingError } from "./errors.js";
import type { DashboardFilter } from "./filter.js";
import { filterAppliesToWidget } from "./filter.js";

export const ParameterMappingSchema = z.object({
  filterField: z.string(),
  queryParam: z.string(),
});
export type ParameterMapping = z.infer<typeof ParameterMappingSchema>;

export const QueryBindingSchema = z.object({
  widgetId: z.string(),
  queryId: z.string(),
  parameterMappings: z.array(ParameterMappingSchema).default([]),
  overrideLimit: z.number().int().min(1).max(100_000).optional(),
  overrideOffset: z.number().int().min(0).optional(),
});
export type QueryBinding = z.infer<typeof QueryBindingSchema>;

export function makeQueryBinding(widgetId: string, queryId: string, mappings?: ParameterMapping[]): QueryBinding {
  return {
    widgetId,
    queryId,
    parameterMappings: mappings ?? [],
  };
}

export function applyFiltersToQuery(
  query: SelectQuery,
  filters: readonly DashboardFilter[],
  widgetId: string,
  binding: QueryBinding
): Result<SelectQuery, FilterBindingError> {
  const applicableFilters = filters.filter((f) => filterAppliesToWidget(f, widgetId));
  if (applicableFilters.length === 0) return ok(query);

  const mappedParams = new Map(binding.parameterMappings.map((m) => [m.filterField, m.queryParam]));

  const additionalPredicates = applicableFilters.map((f) => {
    const paramName = mappedParams.get(f.field) ?? f.field;
    return buildFilterPredicate(paramName, f.operator, f.value);
  });

  const combinedWhere = mergePredicates(query.where, additionalPredicates);

  return ok({
    ...query,
    where: combinedWhere,
    ...(binding.overrideLimit !== undefined ? { limit: binding.overrideLimit } : {}),
    ...(binding.overrideOffset !== undefined ? { offset: binding.overrideOffset } : {}),
  });
}

function buildFilterPredicate(
  field: string,
  operator: string,
  value: string | number | boolean | (string | number)[]
): import("@veritas/query-engine").Predicate {
  if (operator === "in" && Array.isArray(value)) {
    return {
      kind: "comparison" as const,
      left: { kind: "column" as const, name: field },
      op: "in" as const,
      right: { kind: "literal" as const, value: JSON.stringify(value) },
    };
  }
  const opMap: Record<string, import("@veritas/query-engine").ComparisonOp> = {
    eq: "eq",
    neq: "neq",
    gt: "gt",
    gte: "gte",
    lt: "lt",
    lte: "lte",
    contains: "like",
  };
  const mappedOp = opMap[operator] ?? "eq";
  const literalValue = Array.isArray(value) ? String(value[0]) : typeof value === "boolean" ? String(value) : value;
  return {
    kind: "comparison" as const,
    left: { kind: "column" as const, name: field },
    op: mappedOp,
    right: { kind: "literal" as const, value: literalValue },
  };
}

function mergePredicates(
  existing: import("@veritas/query-engine").Predicate | undefined,
  additional: import("@veritas/query-engine").Predicate[]
): import("@veritas/query-engine").Predicate | undefined {
  if (additional.length === 0) return existing;
  const combined: import("@veritas/query-engine").LogicalPredicate = {
    kind: "logical",
    op: "and",
    operands: additional,
  };
  if (!existing) return combined;
  return {
    kind: "logical",
    op: "and",
    operands: [existing, combined],
  };
}
