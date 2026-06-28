// Zod schemas for apps feature HTTP request/response validation
import { z } from "zod";
import { AppEnvironmentSchema, AppStatusSchema } from "@veritas/developer-portal";
import { metadataSchema, urlSchema, nonEmptyString } from "@veritas/contracts";

export const CreateAppBodySchema = z.object({
  organizationId: z.string().min(1),
  ownerId: z.string().min(1),
  name: nonEmptyString,
  description: z.string().max(500).optional(),
  websiteUrl: urlSchema.optional(),
  logoUrl: urlSchema.optional(),
  environments: z.array(AppEnvironmentSchema).min(1).default(["development"]),
  metadata: metadataSchema.default({}),
});
export type CreateAppBody = z.infer<typeof CreateAppBodySchema>;

export const UpdateAppBodySchema = z.object({
  name: nonEmptyString.optional(),
  description: z.string().max(500).optional(),
  websiteUrl: urlSchema.optional(),
  logoUrl: urlSchema.optional(),
  environments: z.array(AppEnvironmentSchema).min(1).optional(),
  metadata: metadataSchema.optional(),
});
export type UpdateAppBody = z.infer<typeof UpdateAppBodySchema>;

export const AppIdParamSchema = z.object({ id: z.string().min(1) });
export type AppIdParam = z.infer<typeof AppIdParamSchema>;

export const ListAppsQuerySchema = z.object({
  organizationId: z.string().optional(),
  status: AppStatusSchema.optional(),
});
export type ListAppsQuery = z.infer<typeof ListAppsQuerySchema>;

export const AppResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    organizationId: z.string(),
    ownerId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    websiteUrl: z.string().optional(),
    logoUrl: z.string().optional(),
    environments: z.array(AppEnvironmentSchema),
    status: AppStatusSchema,
    metadata: metadataSchema,
    timestamps: z.object({ createdAt: z.string(), updatedAt: z.string() }),
  }),
});
