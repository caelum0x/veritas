// Developer portal team membership — manage members of a developer app
import { z } from "zod";
import { newId, type IsoTimestamp } from "@veritas/core";
import { nonEmptyString, metadataSchema, timestampsSchema } from "@veritas/contracts";

export const TeamRoleSchema = z.enum(["owner", "admin", "developer", "viewer"]);
export type TeamRole = z.infer<typeof TeamRoleSchema>;

export const TeamMemberStatusSchema = z.enum(["active", "invited", "removed"]);
export type TeamMemberStatus = z.infer<typeof TeamMemberStatusSchema>;

export const TeamMemberSchema = z.object({
  id: z.string(),
  appId: z.string(),
  userId: z.string(),
  email: nonEmptyString,
  role: TeamRoleSchema,
  status: TeamMemberStatusSchema,
  invitedBy: z.string(),
  metadata: metadataSchema,
  timestamps: timestampsSchema,
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const InviteTeamMemberSchema = z.object({
  appId: z.string(),
  email: z.string().email(),
  role: TeamRoleSchema.default("developer"),
  invitedBy: z.string(),
  metadata: metadataSchema.default({}),
});

export type InviteTeamMember = z.infer<typeof InviteTeamMemberSchema>;

export const UpdateTeamMemberSchema = z.object({
  role: TeamRoleSchema.optional(),
  metadata: metadataSchema.optional(),
});

export type UpdateTeamMember = z.infer<typeof UpdateTeamMemberSchema>;

export function inviteTeamMember(input: InviteTeamMember, now: IsoTimestamp): TeamMember {
  return {
    id: newId("member"),
    appId: input.appId,
    userId: "",
    email: input.email,
    role: input.role,
    status: "invited",
    invitedBy: input.invitedBy,
    metadata: input.metadata,
    timestamps: { createdAt: now, updatedAt: now },
  };
}

export function acceptInvite(member: TeamMember, userId: string, now: IsoTimestamp): TeamMember {
  return { ...member, userId, status: "active", timestamps: { ...member.timestamps, updatedAt: now } };
}

export function updateTeamMember(member: TeamMember, patch: UpdateTeamMember, now: IsoTimestamp): TeamMember {
  return { ...member, ...patch, timestamps: { ...member.timestamps, updatedAt: now } };
}

export function removeTeamMember(member: TeamMember, now: IsoTimestamp): TeamMember {
  return { ...member, status: "removed", timestamps: { ...member.timestamps, updatedAt: now } };
}

export function canManageMembers(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageApp(role: TeamRole): boolean {
  return role === "owner";
}
