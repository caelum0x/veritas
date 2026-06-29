// Zod validators for role admin endpoints
import { z } from "zod";
import { paginationSchema } from "@veritas/contracts";

export const listRolesSchema = z.object({
  query: paginationSchema.extend({
    search: z.string().optional(),
    organizationId: z.string().optional(),
  }),
});

export const getRoleSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    organizationId: z.string().min(1).optional(),
    permissions: z.array(z.string()).default([]),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const updateRoleSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    permissions: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const deleteRoleSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const assignPermissionsSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    permissions: z.array(z.string().min(1)).min(1),
  }),
});

export const revokePermissionsSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    permissions: z.array(z.string().min(1)).min(1),
  }),
});

export type ListRolesInput = z.infer<typeof listRolesSchema>;
export type GetRoleInput = z.infer<typeof getRoleSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type DeleteRoleInput = z.infer<typeof deleteRoleSchema>;
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>;
export type RevokePermissionsInput = z.infer<typeof revokePermissionsSchema>;
