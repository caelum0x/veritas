// Tool category definitions and hierarchy for the Veritas tool registry.

import { z } from "zod";

export const ToolCategorySchema = z.enum([
  "verification",
  "search",
  "analysis",
  "data",
  "communication",
  "storage",
  "llm",
  "utility",
  "security",
  "monitoring",
]);

export type ToolCategory = z.infer<typeof ToolCategorySchema>;

export const TOOL_CATEGORY_LABELS: Readonly<Record<ToolCategory, string>> = {
  verification: "Verification",
  search: "Search & Discovery",
  analysis: "Analysis",
  data: "Data Processing",
  communication: "Communication",
  storage: "Storage",
  llm: "LLM & AI",
  utility: "Utilities",
  security: "Security",
  monitoring: "Monitoring",
};

export const TOOL_CATEGORY_DESCRIPTIONS: Readonly<Record<ToolCategory, string>> = {
  verification: "Tools for verifying claims and sources",
  search: "Tools for searching and discovering information",
  analysis: "Tools for analyzing content and data",
  data: "Tools for processing and transforming data",
  communication: "Tools for sending messages and notifications",
  storage: "Tools for reading and writing persistent data",
  llm: "Tools leveraging language models",
  utility: "General-purpose utility tools",
  security: "Tools for authentication, authorization, and security checks",
  monitoring: "Tools for metrics, logging, and health checks",
};

export function isToolCategory(value: unknown): value is ToolCategory {
  return ToolCategorySchema.safeParse(value).success;
}

export function getLabelForCategory(category: ToolCategory): string {
  return TOOL_CATEGORY_LABELS[category];
}

export function getDescriptionForCategory(category: ToolCategory): string {
  return TOOL_CATEGORY_DESCRIPTIONS[category];
}

export const ALL_TOOL_CATEGORIES: readonly ToolCategory[] = ToolCategorySchema.options;
