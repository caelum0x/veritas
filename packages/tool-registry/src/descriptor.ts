// Tool descriptor schema and factory for declarative tool metadata.

import { z } from "zod";
import { toolParamSchema } from "./types.js";
import { ToolCategorySchema } from "./category.js";

/** Stable identifier for a registered tool, snake_case. */
export const toolIdSchema = z.string().min(1).max(128).regex(/^[a-z][a-z0-9_-]*$/);
export type ToolId = z.infer<typeof toolIdSchema>;

/** Semantic version string. */
export const toolVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/, "semver required");
export type ToolVersion = z.infer<typeof toolVersionSchema>;

export const toolStatusSchema = z.enum(["active", "deprecated", "disabled"]);
export type ToolStatus = z.infer<typeof toolStatusSchema>;

/** Zod schema for a fully-formed tool descriptor. */
export const toolDescriptorSchema = z.object({
  id: toolIdSchema,
  name: z.string().min(1).max(256),
  description: z.string().min(1),
  version: toolVersionSchema,
  category: ToolCategorySchema,
  status: toolStatusSchema.default("active"),
  parameters: z.array(toolParamSchema).default([]),
  requiredPermissions: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  author: z.string().optional(),
  documentationUrl: z.string().url().optional(),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ToolDescriptor = z.infer<typeof toolDescriptorSchema>;

/** Input shape for registering a new tool (omit server-managed fields). */
export const createToolDescriptorSchema = toolDescriptorSchema.omit({
  createdAt: true,
  updatedAt: true,
});
export type CreateToolDescriptor = z.infer<typeof createToolDescriptorSchema>;

/** Factory: produce a validated ToolDescriptor from partial input. */
export function makeToolDescriptor(
  input: CreateToolDescriptor & { createdAt?: string; updatedAt?: string },
): ToolDescriptor {
  const now = new Date().toISOString();
  return toolDescriptorSchema.parse({
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });
}
