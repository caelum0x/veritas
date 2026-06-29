// Membership entity: a user's role-scoped link to an organization.

import { z } from "zod";
import { idSchema, timestampsSchema } from "./common.js";

export const MembershipRoleSchema = z.enum([
  "OWNER",
  "ADMIN",
  "MEMBER",
  "VIEWER",
]);
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;

export const MembershipSchema = z
  .object({
    id: idSchema("mbr"),
    organizationId: idSchema("org"),
    userId: idSchema("user"),
    role: MembershipRoleSchema,
    invitedBy: idSchema("user").nullable(),
    acceptedAt: z.string().nullable(),
  })
  .merge(timestampsSchema);
export type Membership = z.infer<typeof MembershipSchema>;

export const CreateMembershipSchema = z.object({
  organizationId: idSchema("org"),
  userId: idSchema("user"),
  role: MembershipRoleSchema,
  invitedBy: idSchema("user").nullable().optional(),
});
export type CreateMembership = z.infer<typeof CreateMembershipSchema>;

export const UpdateMembershipSchema = z.object({
  role: MembershipRoleSchema.optional(),
  acceptedAt: z.string().nullable().optional(),
});
export type UpdateMembership = z.infer<typeof UpdateMembershipSchema>;
