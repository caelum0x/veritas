// Report section definitions — composable building blocks within a report.
import { z } from "zod";
import { ChartSpecSchema } from "./chart.js";

export const SectionTypeSchema = z.enum([
  "summary",
  "table",
  "chart",
  "text",
  "metric",
  "divider",
]);
export type SectionType = z.infer<typeof SectionTypeSchema>;

export const ColumnDefSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "date", "url"]).default("string"),
  sortable: z.boolean().default(false),
  width: z.string().optional(),
  format: z.string().optional(),
});
export type ColumnDef = z.infer<typeof ColumnDefSchema>;

export const MetricItemSchema = z.object({
  label: z.string().min(1),
  valueKey: z.string().min(1),
  unit: z.string().optional(),
  trend: z.enum(["up", "down", "neutral"]).optional(),
});
export type MetricItem = z.infer<typeof MetricItemSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SectionDefSchema: z.ZodType<SectionDef, z.ZodTypeDef, any> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: SectionTypeSchema,
    title: z.string().optional(),
    description: z.string().optional(),
    dataKey: z.string().optional(),
    columns: z.array(ColumnDefSchema).optional(),
    chart: ChartSpecSchema.optional(),
    metrics: z.array(MetricItemSchema).optional(),
    content: z.string().optional(),
    subsections: z.array(SectionDefSchema).optional(),
    visible: z.boolean().default(true),
    pageBreakBefore: z.boolean().default(false),
  }),
);

export type SectionDef = {
  id: string;
  type: SectionType;
  title?: string;
  description?: string;
  dataKey?: string;
  columns?: ColumnDef[];
  chart?: z.infer<typeof ChartSpecSchema>;
  metrics?: MetricItem[];
  content?: string;
  subsections?: SectionDef[];
  visible?: boolean;
  pageBreakBefore?: boolean;
};

export type SectionData = {
  readonly sectionId: string;
  readonly rows?: ReadonlyArray<Record<string, unknown>>;
  readonly metricValues?: Record<string, number | string>;
  readonly text?: string;
};

/** Extract the flat ordered list of visible section ids from a nested tree. */
export function flattenSections(sections: ReadonlyArray<SectionDef>): ReadonlyArray<SectionDef> {
  const result: SectionDef[] = [];
  for (const s of sections) {
    if (s.visible === false) continue;
    result.push(s);
    if (s.subsections && s.subsections.length > 0) {
      result.push(...flattenSections(s.subsections));
    }
  }
  return result;
}

/** Find a section by id in a possibly-nested tree. */
export function findSection(
  sections: ReadonlyArray<SectionDef>,
  id: string,
): SectionDef | undefined {
  for (const s of sections) {
    if (s.id === id) return s;
    if (s.subsections) {
      const found = findSection(s.subsections, id);
      if (found) return found;
    }
  }
  return undefined;
}
