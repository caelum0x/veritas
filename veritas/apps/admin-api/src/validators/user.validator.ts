// Zod validators for user admin endpoints
import { z } from "zod";
import { paginationSchema } from "@veritas/contracts";

export const ListUsersQuerySchema = z.object({
  query: paginationSchema.extend({
    search: z.string().optional(),
    organizationId: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export const UserIdParamSchema = z.object({
  id: z.string().min(1),
});

export const UpdateUserBodySchema = z.object({
  body: z.object({
    displayName: z.string().min(1).max(255).optional(),
    email: z.string().email().optional(),
    isActive: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const AssignRoleBodySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    roleId: z.string().min(1),
    organizationId: z.string().min(1).optional(),
  }),
});

export const RevokeRoleBodySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    roleId: z.string().min(1),
    organizationId: z.string().min(1).optional(),
  }),
});

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;
export type UserIdParam = z.infer<typeof UserIdParamSchema>;
export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;
export type AssignRoleInput = z.infer<typeof AssignRoleBodySchema>;
export type RevokeRoleInput = z.infer<typeof RevokeRoleBodySchema>;
