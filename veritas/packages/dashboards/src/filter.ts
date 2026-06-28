// Dashboard-level filters: definitions, validation, and application utilities.
import { z } from "zod";
import { newId, ok, err, Result } from "@veritas/core";
import { filterId } from "./types.js";
import { FilterBindingError } from "./errors.js";

export const FilterOperatorSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]);
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const FilterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number()])),
]);
export type FilterValue = z.infer<typeof FilterValueSchema>;

export const DashboardFilterSchema = z.object({
  id: z.string(),
  label: z.string(),
  field: z.string(),
  operator: FilterOperatorSchema,
  value: FilterValueSchema,
  isGlobal: z.boolean().default(true),
  appliesToWidgets: z.array(z.string()).default([]),
});
export type DashboardFilter = z.infer<typeof DashboardFilterSchema>;

export const CreateFilterSchema = z.object({
  label: z.string(),
  field: z.string(),
  operator: FilterOperatorSchema,
  value: FilterValueSchema,
  isGlobal: z.boolean().optional().default(true),
  appliesToWidgets: z.array(z.string()).optional().default([]),
});
export type CreateFilter = z.infer<typeof CreateFilterSchema>;

export function makeFilter(input: CreateFilter): DashboardFilter {
  return {
    id: filterId(newId("filter")) as unknown as string,
    label: input.label,
    field: input.field,
    operator: input.operator,
    value: input.value,
    isGlobal: input.isGlobal ?? true,
    appliesToWidgets: input.appliesToWidgets ?? [],
  };
}

export function updateFilter(filter: DashboardFilter, patch: Partial<Omit<DashboardFilter, "id">>): DashboardFilter {
  return { ...filter, ...patch };
}

export function filterAppliesToWidget(filter: DashboardFilter, widgetId: string): boolean {
  if (filter.isGlobal) return true;
  return filter.appliesToWidgets.includes(widgetId);
}

export function validateFilter(filter: DashboardFilter): Result<DashboardFilter, FilterBindingError> {
  if (!filter.field.trim()) return err(new FilterBindingError("Filter field must not be empty"));
  if (filter.operator === "in") {
    if (!Array.isArray(filter.value) || filter.value.length === 0) {
      return err(new FilterBindingError(`Filter with operator 'in' requires a non-empty array value`));
    }
  }
  return ok(filter);
}

export function applyFiltersToRecord(
  record: Readonly<Record<string, unknown>>,
  filters: readonly DashboardFilter[],
  widgetId: string
): boolean {
  for (const filter of filters) {
    if (!filterAppliesToWidget(filter, widgetId)) continue;
    const fieldValue = record[filter.field];
    if (!matchesFilter(fieldValue, filter.operator, filter.value)) return false;
  }
  return true;
}

function matchesFilter(fieldValue: unknown, operator: FilterOperator, filterValue: FilterValue): boolean {
  switch (operator) {
    case "eq": return fieldValue === filterValue;
    case "neq": return fieldValue !== filterValue;
    case "gt": return typeof fieldValue === "number" && typeof filterValue === "number" && fieldValue > filterValue;
    case "gte": return typeof fieldValue === "number" && typeof filterValue === "number" && fieldValue >= filterValue;
    case "lt": return typeof fieldValue === "number" && typeof filterValue === "number" && fieldValue < filterValue;
    case "lte": return typeof fieldValue === "number" && typeof filterValue === "number" && fieldValue <= filterValue;
    case "in": return Array.isArray(filterValue) && filterValue.includes(fieldValue as string | number);
    case "contains":
      return typeof fieldValue === "string" && typeof filterValue === "string" && fieldValue.includes(filterValue);
    default: return true;
  }
}
