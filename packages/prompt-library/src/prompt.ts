// Prompt template definition — typed, versioned, with variable schema.
import { z } from "zod";

export const PromptRoleSchema = z.enum(["system", "user", "assistant"]);
export type PromptRole = z.infer<typeof PromptRoleSchema>;

export const PromptMessageSchema = z.object({
  role: PromptRoleSchema,
  content: z.string().min(1),
});
export type PromptMessage = z.infer<typeof PromptMessageSchema>;

export const PromptVariableSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  required: z.boolean().default(true),
  defaultValue: z.string().optional(),
});
export type PromptVariable = z.infer<typeof PromptVariableSchema>;

export const PromptMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  category: z.string().default("general"),
  tags: z.array(z.string()).default([]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "must be semver"),
  author: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type PromptMeta = z.infer<typeof PromptMetaSchema>;

export const PromptTemplateSchema = z.object({
  meta: PromptMetaSchema,
  variables: z.array(PromptVariableSchema).default([]),
  messages: z.array(PromptMessageSchema).min(1),
  partials: z.array(z.string()).default([]),
});
export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;

/** Construct a PromptTemplate with defaults applied. */
export function definePrompt(
  raw: Omit<PromptTemplate, never>
): PromptTemplate {
  return PromptTemplateSchema.parse(raw);
}
