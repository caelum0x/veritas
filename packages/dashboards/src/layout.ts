// Grid layout engine: places widgets in a 12-column responsive grid.
import { z } from "zod";
import { ok, err, Result } from "@veritas/core";
import { LayoutConflictError } from "./errors.js";

export const GridPositionSchema = z.object({
  col: z.number().int().min(0).max(11),
  row: z.number().int().min(0),
  colSpan: z.number().int().min(1).max(12),
  rowSpan: z.number().int().min(1),
});
export type GridPosition = z.infer<typeof GridPositionSchema>;

export const LayoutItemSchema = z.object({
  widgetId: z.string(),
  position: GridPositionSchema,
  minW: z.number().int().min(1).default(1),
  minH: z.number().int().min(1).default(1),
  isResizable: z.boolean().default(true),
  isDraggable: z.boolean().default(true),
});
export type LayoutItem = z.infer<typeof LayoutItemSchema>;

export const GridLayoutSchema = z.object({
  columns: z.number().int().min(1).max(24).default(12),
  rowHeightPx: z.number().int().min(20).default(80),
  gapPx: z.number().int().min(0).default(8),
  items: z.array(LayoutItemSchema).default([]),
});
export type GridLayout = z.infer<typeof GridLayoutSchema>;

export function makeLayout(overrides?: Partial<GridLayout>): GridLayout {
  return GridLayoutSchema.parse(overrides ?? {});
}

export function addLayoutItem(layout: GridLayout, item: LayoutItem): Result<GridLayout, LayoutConflictError> {
  const conflict = detectCollision(layout.items, item);
  if (conflict) return err(new LayoutConflictError(`Widget ${item.widgetId} overlaps with ${conflict.widgetId}`));
  if (item.position.col + item.position.colSpan > layout.columns) {
    return err(new LayoutConflictError(`Widget ${item.widgetId} exceeds grid width`));
  }
  return ok({ ...layout, items: [...layout.items, item] });
}

export function removeLayoutItem(layout: GridLayout, widgetId: string): GridLayout {
  return { ...layout, items: layout.items.filter((i) => i.widgetId !== widgetId) };
}

export function updateLayoutItem(layout: GridLayout, widgetId: string, patch: Partial<GridPosition>): Result<GridLayout, LayoutConflictError> {
  const idx = layout.items.findIndex((i) => i.widgetId === widgetId);
  if (idx === -1) return ok(layout);
  const updated: LayoutItem = { ...layout.items[idx]!, position: { ...layout.items[idx]!.position, ...patch } };
  const others = layout.items.filter((i) => i.widgetId !== widgetId);
  const conflict = detectCollision(others, updated);
  if (conflict) return err(new LayoutConflictError(`Widget ${widgetId} overlaps with ${conflict.widgetId}`));
  if (updated.position.col + updated.position.colSpan > layout.columns) {
    return err(new LayoutConflictError(`Widget ${widgetId} exceeds grid width`));
  }
  return ok({ ...layout, items: [...others, updated] });
}

function detectCollision(items: readonly LayoutItem[], candidate: LayoutItem): LayoutItem | undefined {
  for (const item of items) {
    if (item.widgetId === candidate.widgetId) continue;
    const p = item.position;
    const c = candidate.position;
    const colOverlap = p.col < c.col + c.colSpan && p.col + p.colSpan > c.col;
    const rowOverlap = p.row < c.row + c.rowSpan && p.row + p.rowSpan > c.row;
    if (colOverlap && rowOverlap) return item;
  }
  return undefined;
}
