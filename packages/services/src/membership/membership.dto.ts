// Input/output DTOs for membership application service use-cases.
import { z } from "zod";
import {
  MembershipSchema,
  CreateMembershipSchema,
  UpdateMembershipSchema,
  MembershipRoleSchema,
} from "@veritas/contracts";

/** Input DTO for adding a user to an organization. */
export const CreateMembershipInputSchema = CreateMembershipSchema;
export type CreateMembershipInput = z.infer<typeof CreateMembershipInputSchema>;

/** Input DTO for updating a membership's role or acceptance status. */
export const UpdateMembershipInputSchema = UpdateMembershipSchema;
export type UpdateMembershipInput = z.infer<typeof UpdateMembershipInputSchema>;

/** Query options for listing memberships. */
export const ListMembershipsInputSchema = z.object({
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  role: MembershipRoleSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListMembershipsInput = z.infer<typeof ListMembershipsInputSchema>;

/** Input DTO for accepting a pending membership invitation. */
export const AcceptMembershipInputSchema = z.object({
  membershipId: z.string().min(1),
  acceptedAt: z.string().optional(),
});
export type AcceptMembershipInput = z.infer<typeof AcceptMembershipInputSchema>;

/** Input DTO for changing a member's role within an organization. */
export const ChangeMembershipRoleInputSchema = z.object({
  membershipId: z.string().min(1),
  role: MembershipRoleSchema,
});
export type ChangeMembershipRoleInput = z.infer<typeof ChangeMembershipRoleInputSchema>;

/** Output DTO: a single membership record. */
export const MembershipOutputSchema = MembershipSchema;
export type MembershipOutput = z.infer<typeof MembershipOutputSchema>;

/** Output DTO: paginated list of memberships. */
export const MembershipListOutputSchema = z.object({
  items: z.array(MembershipSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type MembershipListOutput = z.infer<typeof MembershipListOutputSchema>;

/** Factory to produce a canonical MembershipOutput from a raw record. */
export function toMembershipOutput(membership: MembershipOutput): MembershipOutput {
  return { ...membership };
}
