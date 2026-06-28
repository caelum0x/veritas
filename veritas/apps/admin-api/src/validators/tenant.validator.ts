// Zod schemas for tenant admin endpoint request validation.
import { z } from "zod";

export const CreateTenantBodySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,63}$/, "Slug must be 2-63 lowercase alphanumeric or dash characters"),
  displayName: z.string().min(2).max(120),
  organizationId: z.string().min(1),
  planId: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateTenantBody = z.infer<typeof CreateTenantBodySchema>;

export const UpdateTenantBodySchema = z.object({
  displayName: z.string().min(2).max(120).optional(),
  planId: z.string().min(1).optional(),
  status: z.enum(["active", "suspended", "deprovisioned"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateTenantBody = z.infer<typeof UpdateTenantBodySchema>;

export const TenantIdParamSchema = z.object({
  id: z.string().min(1, "Tenant ID is required"),
});

export type TenantIdParam = z.infer<typeof TenantIdParamSchema>;

export const ListTenantsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  cursor: z.string().optional(),
  status: z.enum(["active", "suspended", "deprovisioned"]).optional(),
  organizationId: z.string().optional(),
});

export type ListTenantsQuery = z.infer<typeof ListTenantsQuerySchema>;
