// Zod request/response validation schemas for the tenants feature.
import { z } from "zod";
import { CreateOrganizationSchema, UpdateOrganizationSchema } from "@veritas/contracts";

export const CreateTenantBodySchema = CreateOrganizationSchema;
export type CreateTenantBody = z.infer<typeof CreateTenantBodySchema>;

export const UpdateTenantBodySchema = UpdateOrganizationSchema;
export type UpdateTenantBody = z.infer<typeof UpdateTenantBodySchema>;

export const TenantParamsSchema = z.object({
  orgId: z.string().min(1),
});
export type TenantParams = z.infer<typeof TenantParamsSchema>;

export const ListTenantsQuerySchema = z.object({
  ownerId: z.string().optional(),
  slug: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListTenantsQuery = z.infer<typeof ListTenantsQuerySchema>;

export const TransferOwnershipBodySchema = z.object({
  newOwnerId: z.string().min(1),
});
export type TransferOwnershipBody = z.infer<typeof TransferOwnershipBodySchema>;
