// Zod validators for organization request bodies and query params
import { z } from "zod";
import { CreateOrganizationSchema, UpdateOrganizationSchema } from "@veritas/contracts";
import { paginationSchema } from "@veritas/contracts";

export const createOrganizationValidator = CreateOrganizationSchema;

export const updateOrganizationValidator = UpdateOrganizationSchema;

export const listOrganizationsValidator = z.object({
  query: paginationSchema.extend({
    name: z.string().optional(),
    slug: z.string().optional(),
  }),
});

export const getOrganizationValidator = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const deleteOrganizationValidator = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationValidator>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationValidator>;
export type ListOrganizationsQuery = z.infer<typeof listOrganizationsValidator>["query"];
