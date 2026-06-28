// Report template definitions — reusable blueprints for report generation.
import { z } from "zod";
import { newId } from "@veritas/core";
import { ParameterDefSchema } from "./parameter.js";
import { SectionDefSchema } from "./section.js";

export const TemplateIdSchema = z.string().brand<"TemplateId">();
export type TemplateId = z.infer<typeof TemplateIdSchema>;

export const ReportFormatSchema = z.enum(["json", "csv", "html", "pdf", "markdown"]);
export type ReportFormat = z.infer<typeof ReportFormatSchema>;

export const TemplateSchema = z.object({
  id: TemplateIdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().default("1.0.0"),
  defaultFormat: ReportFormatSchema.default("json"),
  parameters: z.array(ParameterDefSchema).default([]),
  sections: z.array(SectionDefSchema).default([]),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Template = z.infer<typeof TemplateSchema>;

export const CreateTemplateSchema = TemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateTemplate = z.infer<typeof CreateTemplateSchema>;

/** In-memory template registry. */
const registry = new Map<string, Template>();

export function registerTemplate(input: CreateTemplate): Template {
  const now = new Date().toISOString();
  const template = TemplateSchema.parse({
    ...input,
    id: newId("Template") as unknown as TemplateId,
    createdAt: now,
    updatedAt: now,
  });
  registry.set(template.id, template);
  return template;
}

export function getTemplate(id: string): Template | undefined {
  return registry.get(id);
}

export function listTemplates(tag?: string): ReadonlyArray<Template> {
  const all = Array.from(registry.values());
  if (tag === undefined) return all;
  return all.filter((t) => t.tags.includes(tag));
}

export function removeTemplate(id: string): boolean {
  return registry.delete(id);
}
