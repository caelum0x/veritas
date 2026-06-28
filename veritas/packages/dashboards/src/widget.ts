// Widget definitions: types, schemas, and factory for dashboard widgets.
import { z } from "zod";
import { newId } from "@veritas/core";
import { widgetId, WidgetId } from "./types.js";

export const WidgetTypeSchema = z.enum([
  "metric",
  "bar_chart",
  "line_chart",
  "pie_chart",
  "table",
  "text",
  "heatmap",
  "scatter",
]);
export type WidgetType = z.infer<typeof WidgetTypeSchema>;

export const WidgetDisplayOptionsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  colorScheme: z.string().optional(),
  showLegend: z.boolean().default(true),
  showGrid: z.boolean().default(true),
  decimalPlaces: z.number().int().min(0).max(10).default(2),
  unit: z.string().optional(),
  thresholds: z
    .array(z.object({ value: z.number(), color: z.string(), label: z.string().optional() }))
    .default([]),
});
export type WidgetDisplayOptions = z.infer<typeof WidgetDisplayOptionsSchema>;

export const WidgetSchema = z.object({
  id: z.string(),
  type: WidgetTypeSchema,
  queryId: z.string().optional(),
  displayOptions: WidgetDisplayOptionsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Widget = z.infer<typeof WidgetSchema>;

export const CreateWidgetSchema = z.object({
  type: WidgetTypeSchema,
  queryId: z.string().optional(),
  displayOptions: WidgetDisplayOptionsSchema.partial().optional(),
});
export type CreateWidget = z.infer<typeof CreateWidgetSchema>;

export function makeWidget(input: CreateWidget): Widget {
  const now = new Date().toISOString();
  const defaults = WidgetDisplayOptionsSchema.parse(input.displayOptions ?? {});
  return {
    id: widgetId(newId("widget")) as unknown as string,
    type: input.type,
    ...(input.queryId !== undefined ? { queryId: input.queryId } : {}),
    displayOptions: defaults,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateWidget(widget: Widget, patch: Partial<Pick<Widget, "queryId" | "displayOptions">>): Widget {
  return {
    ...widget,
    ...(patch.queryId !== undefined ? { queryId: patch.queryId } : {}),
    ...(patch.displayOptions !== undefined ? { displayOptions: { ...widget.displayOptions, ...patch.displayOptions } } : {}),
    updatedAt: new Date().toISOString(),
  };
}

export function widgetHasQuery(widget: Widget): widget is Widget & { queryId: string } {
  return widget.queryId !== undefined;
}
