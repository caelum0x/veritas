// Export template registry — named presets that combine format and default options
import { z } from "zod";
import type { ExportFormat } from "./format.js";
import type { ExportOptions } from "./types.js";

export const ExportTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  format: z.enum(["json", "csv", "markdown", "pdf", "html"]),
  defaultOptions: z.record(z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime().optional(),
});

export type ExportTemplate = z.infer<typeof ExportTemplateSchema>;

export interface TemplateStore {
  get(id: string): ExportTemplate | undefined;
  list(): readonly ExportTemplate[];
  register(template: ExportTemplate): void;
  remove(id: string): boolean;
}

const BUILTIN_TEMPLATES: readonly ExportTemplate[] = [
  {
    id: "verification-report-pdf",
    name: "Verification Report (PDF)",
    description: "Full-page branded PDF for verification reports",
    format: "pdf",
    defaultOptions: { includeMetadata: true },
    tags: ["report", "pdf", "branded"],
  },
  {
    id: "verification-report-html",
    name: "Verification Report (HTML)",
    description: "Responsive HTML page for verification reports",
    format: "html",
    defaultOptions: { includeMetadata: true },
    tags: ["report", "html", "branded"],
  },
  {
    id: "claims-csv",
    name: "Claims Export (CSV)",
    description: "Flat CSV suitable for spreadsheet analysis",
    format: "csv",
    defaultOptions: { includeMetadata: false },
    tags: ["claims", "csv"],
  },
  {
    id: "report-markdown",
    name: "Report (Markdown)",
    description: "Markdown report for documentation or wiki embedding",
    format: "markdown",
    defaultOptions: { includeMetadata: true },
    tags: ["report", "markdown"],
  },
];

export class InMemoryTemplateStore implements TemplateStore {
  private readonly templates: Map<string, ExportTemplate>;

  constructor(initial: readonly ExportTemplate[] = BUILTIN_TEMPLATES) {
    this.templates = new Map(initial.map((t) => [t.id, t]));
  }

  get(id: string): ExportTemplate | undefined {
    return this.templates.get(id);
  }

  list(): readonly ExportTemplate[] {
    return Array.from(this.templates.values());
  }

  register(template: ExportTemplate): void {
    this.templates.set(template.id, template);
  }

  remove(id: string): boolean {
    return this.templates.delete(id);
  }
}

export function mergeTemplateOptions(
  template: ExportTemplate,
  overrides: Partial<ExportOptions>
): ExportOptions {
  return {
    ...(template.defaultOptions as Partial<ExportOptions>),
    ...overrides,
    format: template.format as ExportFormat,
  };
}
