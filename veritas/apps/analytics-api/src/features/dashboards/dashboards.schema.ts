// Zod schemas for dashboard HTTP request/response validation.
import { z } from "zod";
import { VisibilitySchema, RefreshIntervalSchema, GridPositionSchema } from "@veritas/dashboards";

export const CreateDashboardBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  visibility: VisibilitySchema.default("private"),
  refreshInterval: RefreshIntervalSchema.default("none"),
  tags: z.array(z.string().max(64)).max(20).default([]),
});

export type CreateDashboardBody = z.infer<typeof CreateDashboardBodySchema>;

export const UpdateDashboardBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: VisibilitySchema.optional(),
  refreshInterval: RefreshIntervalSchema.optional(),
  tags: z.array(z.string().max(64)).max(20).optional(),
});

export type UpdateDashboardBody = z.infer<typeof UpdateDashboardBodySchema>;

export const DashboardParamsSchema = z.object({
  id: z.string().min(1),
});

export type DashboardParams = z.infer<typeof DashboardParamsSchema>;

export const DashboardListQuerySchema = z.object({
  orgId: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type DashboardListQuery = z.infer<typeof DashboardListQuerySchema>;

export const DashboardDataQuerySchema = z.object({
  orgId: z.string().min(1),
  from: z.string(),
  to: z.string(),
  granularity: z.enum(["hour", "day", "week", "month"]).default("day"),
});

export type DashboardDataQuery = z.infer<typeof DashboardDataQuerySchema>;

export const AddWidgetBodySchema = z.object({
  type: z.enum(["metric", "bar_chart", "line_chart", "pie_chart", "table", "text", "heatmap", "scatter"]),
  queryId: z.string().optional(),
  displayOptions: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    colorScheme: z.string().optional(),
    showLegend: z.boolean().default(true),
    showGrid: z.boolean().default(true),
    decimalPlaces: z.number().int().min(0).max(10).default(2),
    unit: z.string().optional(),
    thresholds: z.array(z.object({
      value: z.number(),
      color: z.string(),
      label: z.string().optional(),
    })).default([]),
  }).optional(),
  position: GridPositionSchema.optional(),
});

export type AddWidgetBody = z.infer<typeof AddWidgetBodySchema>;

export const WidgetParamsSchema = z.object({
  id: z.string().min(1),
  widgetId: z.string().min(1),
});

export type WidgetParams = z.infer<typeof WidgetParamsSchema>;
