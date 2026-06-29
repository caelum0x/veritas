// Input/output DTOs for organization application service use-cases.
import { z } from "zod";
import {
  OrganizationSchema,
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
} from "@veritas/contracts";

/** Input DTO for creating a new organization. */
export const CreateOrganizationInputSchema = CreateOrganizationSchema;
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInputSchema>;

/** Input DTO for updating mutable organization fields. */
export const UpdateOrganizationInputSchema = UpdateOrganizationSchema;
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationInputSchema>;

/** Query options for listing organizations. */
export const ListOrganizationsInputSchema = z.object({
  ownerId: z.string().optional(),
  slug: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListOrganizationsInput = z.infer<typeof ListOrganizationsInputSchema>;

/** Input DTO for transferring organization ownership. */
export const TransferOwnershipInputSchema = z.object({
  organizationId: z.string().min(1),
  newOwnerId: z.string().min(1),
});
export type TransferOwnershipInput = z.infer<typeof TransferOwnershipInputSchema>;

/** Output DTO: a single organization record. */
export const OrganizationOutputSchema = OrganizationSchema;
export type OrganizationOutput = z.infer<typeof OrganizationOutputSchema>;

/** Output DTO: paginated list of organizations. */
export const OrganizationListOutputSchema = z.object({
  items: z.array(OrganizationSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type OrganizationListOutput = z.infer<typeof OrganizationListOutputSchema>;

/** Factory to produce a canonical OrganizationOutput from a raw record. */
export function toOrganizationOutput(org: OrganizationOutput): OrganizationOutput {
  return { ...org };
}
