// Chart specification types — declarative chart configs for report sections.
import { z } from "zod";

export const ChartTypeSchema = z.enum([
  "bar",
  "line",
  "area",
  "pie",
  "donut",
  "scatter",
  "histogram",
  "heatmap",
  "funnel",
]);
export type ChartType = z.infer<typeof ChartTypeSchema>;

export const AxisConfigSchema = z.object({
  key: z.string().min(1),
  label: z.string().optional(),
  tickFormat: z.string().optional(),
  domain: z.tuple([z.number(), z.number()]).optional(),
  log: z.boolean().default(false),
});
export type AxisConfig = z.infer<typeof AxisConfigSchema>;

export const SeriesConfigSchema = z.object({
  key: z.string().min(1),
  label: z.string().optional(),
  color: z.string().optional(),
  stackId: z.string().optional(),
  dashed: z.boolean().default(false),
});
export type SeriesConfig = z.infer<typeof SeriesConfigSchema>;

export const LegendPositionSchema = z.enum(["top", "right", "bottom", "left", "none"]);
export type LegendPosition = z.infer<typeof LegendPositionSchema>;

export const ChartSpecSchema = z.object({
  type: ChartTypeSchema,
  title: z.string().optional(),
  xAxis: AxisConfigSchema.optional(),
  yAxis: AxisConfigSchema.optional(),
  series: z.array(SeriesConfigSchema).min(1),
  legend: LegendPositionSchema.default("bottom"),
  stacked: z.boolean().default(false),
  height: z.number().int().positive().default(300),
  colors: z.array(z.string()).optional(),
  showGrid: z.boolean().default(true),
  showTooltip: z.boolean().default(true),
  dataKey: z.string().optional(),
});
export type ChartSpec = z.infer<typeof ChartSpecSchema>;

/** Produce a minimal human-readable summary of a chart spec for plain-text renders. */
export function describeChart(spec: ChartSpec): string {
  const seriesLabels = spec.series.map((s) => s.label ?? s.key).join(", ");
  const xLabel = spec.xAxis?.label ?? spec.xAxis?.key ?? "x";
  return `${spec.type} chart — series: [${seriesLabels}] vs ${xLabel}`;
}

/** Derive safe color defaults when none are specified (up to 10 series). */
export const DEFAULT_PALETTE: ReadonlyArray<string> = [
  "#4f86c6",
  "#e07b54",
  "#5bbd72",
  "#c0616e",
  "#9b59b6",
  "#3fbdb0",
  "#f0c530",
  "#e879b5",
  "#7f8c8d",
  "#2ecc71",
];

export function resolveColors(spec: ChartSpec): ReadonlyArray<string> {
  if (spec.colors && spec.colors.length > 0) return spec.colors;
  return DEFAULT_PALETTE.slice(0, spec.series.length);
}
