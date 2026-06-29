// Organization entity: a billing/ownership tenant grouping users and resources.

import { z } from "zod";
import { idSchema, timestampsSchema, metadataSchema } from "./common.js";

export const OrganizationSchema = z
  .object({
    id: idSchema("org"),
    slug: z.string(),
    name: z.string(),
    ownerId: idSchema("user"),
    billingEmail: z.string().email().nullable(),
    metadata: metadataSchema.optional(),
  })
  .merge(timestampsSchema);
export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationSchema = z.object({
  slug: z.string(),
  name: z.string(),
  ownerId: idSchema("user"),
  billingEmail: z.string().email().nullable().optional(),
  metadata: metadataSchema.optional(),
});
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z.object({
  name: z.string().optional(),
  billingEmail: z.string().email().nullable().optional(),
  metadata: metadataSchema.optional(),
});
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>;
