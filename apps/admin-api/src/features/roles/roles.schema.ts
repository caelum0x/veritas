// Zod validation schemas for the roles feature HTTP endpoints.
import { z } from "zod";

export const listRolesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).optional(),
  search: z.string().optional(),
});
export type ListRolesQuery = z.infer<typeof listRolesQuerySchema>;

export const roleIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type RoleIdParams = z.infer<typeof roleIdParamsSchema>;

export const createRoleBodySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  inherits: z.array(z.string()).default([]),
});
export type CreateRoleBody = z.infer<typeof createRoleBodySchema>;

export const updateRoleBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  inherits: z.array(z.string()).optional(),
});
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>;

export const assignPermissionsBodySchema = z.object({
  permissions: z.array(z.string().min(1)).min(1),
});
export type AssignPermissionsBody = z.infer<typeof assignPermissionsBodySchema>;

export const revokePermissionsBodySchema = z.object({
  permissions: z.array(z.string().min(1)).min(1),
});
export type RevokePermissionsBody = z.infer<typeof revokePermissionsBodySchema>;
