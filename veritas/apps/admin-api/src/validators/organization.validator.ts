// Zod validators for organization admin endpoints
import { z } from "zod";
import { paginationSchema } from "@veritas/contracts";

export const listOrganizationsSchema = z.object({
  query: paginationSchema.extend({
    search: z.string().optional(),
    planId: z.string().optional(),
  }),
});

export const getOrganizationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    planId: z.string().min(1).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const updateOrganizationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    planId: z.string().min(1).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const deleteOrganizationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export type ListOrganizationsInput = z.infer<typeof listOrganizationsSchema>;
export type GetOrganizationInput = z.infer<typeof getOrganizationSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type DeleteOrganizationInput = z.infer<typeof deleteOrganizationSchema>;
