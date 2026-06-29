// Zod validators for permission admin endpoints
import { z } from "zod";
import { paginationSchema } from "@veritas/contracts";

export const listPermissionsSchema = z.object({
  query: paginationSchema.extend({
    search: z.string().optional(),
    resource: z.string().optional(),
    action: z.string().optional(),
  }),
});

export const getPermissionSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createPermissionSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    resource: z.string().min(1).max(100),
    action: z.string().min(1).max(100),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const updatePermissionSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    resource: z.string().min(1).max(100).optional(),
    action: z.string().min(1).max(100).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const deletePermissionSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const assignPermissionToRoleSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    roleId: z.string().min(1),
  }),
});

export type ListPermissionsInput = z.infer<typeof listPermissionsSchema>;
export type GetPermissionInput = z.infer<typeof getPermissionSchema>;
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
export type DeletePermissionInput = z.infer<typeof deletePermissionSchema>;
export type AssignPermissionToRoleInput = z.infer<typeof assignPermissionToRoleSchema>;
