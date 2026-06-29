// Shared primitive types for the dashboards module.
import { z } from "zod";
import { Brand, brand } from "@veritas/core";

export type DashboardId = Brand<string, "DashboardId">;
export type WidgetId = Brand<string, "WidgetId">;
export type FilterId = Brand<string, "FilterId">;
export type SnapshotId = Brand<string, "SnapshotId">;
export type ShareToken = Brand<string, "ShareToken">;

export const dashboardId = (s: string): DashboardId => brand<string, "DashboardId">(s);
export const widgetId = (s: string): WidgetId => brand<string, "WidgetId">(s);
export const filterId = (s: string): FilterId => brand<string, "FilterId">(s);
export const snapshotId = (s: string): SnapshotId => brand<string, "SnapshotId">(s);
export const shareToken = (s: string): ShareToken => brand<string, "ShareToken">(s);

export const VisibilitySchema = z.enum(["private", "org", "public"]);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const RefreshIntervalSchema = z.enum(["none", "30s", "1m", "5m", "15m", "30m", "1h"]);
export type RefreshInterval = z.infer<typeof RefreshIntervalSchema>;

export const GridPositionSchema = z.object({
  col: z.number().int().min(0),
  row: z.number().int().min(0),
  colSpan: z.number().int().min(1).max(12),
  rowSpan: z.number().int().min(1),
});
export type GridPosition = z.infer<typeof GridPositionSchema>;

export const FilterOperatorSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]);
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const FilterValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);
export type FilterValue = z.infer<typeof FilterValueSchema>;
