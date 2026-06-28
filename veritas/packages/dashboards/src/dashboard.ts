// Dashboard aggregate: definition, lifecycle, and immutable mutation helpers.
import { z } from "zod";
import { newId, ok, err, Result } from "@veritas/core";
import { dashboardId, VisibilitySchema } from "./types.js";
import { WidgetSchema, Widget, makeWidget, CreateWidgetSchema } from "./widget.js";
import { GridLayoutSchema, GridLayout, makeLayout, addLayoutItem, removeLayoutItem } from "./layout.js";
import { DashboardFilterSchema, DashboardFilter, makeFilter, CreateFilterSchema } from "./filter.js";
import { QueryBindingSchema, QueryBinding } from "./query-binding.js";
import { DashboardValidationError, WidgetNotFoundError, LayoutConflictError } from "./errors.js";

export const DashboardSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  createdByUserId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  visibility: VisibilitySchema,
  tags: z.array(z.string()).default([]),
  widgets: z.array(WidgetSchema).default([]),
  layout: GridLayoutSchema,
  filters: z.array(DashboardFilterSchema).default([]),
  queryBindings: z.array(QueryBindingSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

export const CreateDashboardSchema = z.object({
  orgId: z.string(),
  createdByUserId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  visibility: VisibilitySchema.optional().default("private"),
  tags: z.array(z.string()).optional().default([]),
});
export type CreateDashboard = z.infer<typeof CreateDashboardSchema>;

export const UpdateDashboardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: VisibilitySchema.optional(),
  tags: z.array(z.string()).optional(),
});
export type UpdateDashboard = z.infer<typeof UpdateDashboardSchema>;

export function makeDashboard(input: CreateDashboard): Dashboard {
  const now = new Date().toISOString();
  return {
    id: dashboardId(newId("dashboard")) as unknown as string,
    orgId: input.orgId,
    createdByUserId: input.createdByUserId,
    title: input.title,
    ...(input.description !== undefined ? { description: input.description } : {}),
    visibility: input.visibility ?? "private",
    tags: input.tags ?? [],
    widgets: [],
    layout: makeLayout(),
    filters: [],
    queryBindings: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateDashboard(dashboard: Dashboard, patch: UpdateDashboard): Dashboard {
  return {
    ...dashboard,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    updatedAt: new Date().toISOString(),
  };
}

export function addWidget(
  dashboard: Dashboard,
  input: z.infer<typeof CreateWidgetSchema>,
  layoutItem: Omit<import("./layout.js").LayoutItem, "widgetId">
): Result<Dashboard, DashboardValidationError | LayoutConflictError> {
  const widget = makeWidget(input);
  const item = { ...layoutItem, widgetId: widget.id };
  const layoutResult = addLayoutItem(dashboard.layout, item);
  if (!layoutResult.ok) return err(layoutResult.error);
  return ok({
    ...dashboard,
    widgets: [...dashboard.widgets, widget],
    layout: layoutResult.value,
    updatedAt: new Date().toISOString(),
  });
}

export function removeWidget(dashboard: Dashboard, wId: string): Result<Dashboard, WidgetNotFoundError> {
  const exists = dashboard.widgets.some((w) => w.id === wId);
  if (!exists) return err(new WidgetNotFoundError(wId));
  return ok({
    ...dashboard,
    widgets: dashboard.widgets.filter((w) => w.id !== wId),
    layout: removeLayoutItem(dashboard.layout, wId),
    queryBindings: dashboard.queryBindings.filter((b) => b.widgetId !== wId),
    updatedAt: new Date().toISOString(),
  });
}

export function addFilterToDashboard(
  dashboard: Dashboard,
  input: z.infer<typeof CreateFilterSchema>
): Dashboard {
  const filter = makeFilter(input);
  return {
    ...dashboard,
    filters: [...dashboard.filters, filter],
    updatedAt: new Date().toISOString(),
  };
}

export function removeFilter(dashboard: Dashboard, fId: string): Dashboard {
  return {
    ...dashboard,
    filters: dashboard.filters.filter((f) => f.id !== fId),
    updatedAt: new Date().toISOString(),
  };
}

export function setQueryBinding(dashboard: Dashboard, binding: QueryBinding): Dashboard {
  const others = dashboard.queryBindings.filter((b) => b.widgetId !== binding.widgetId);
  return {
    ...dashboard,
    queryBindings: [...others, binding],
    updatedAt: new Date().toISOString(),
  };
}
