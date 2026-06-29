// Zod validators for user request bodies, params, and query params.
import { z } from "zod";
import { CreateUserSchema, UpdateUserSchema } from "@veritas/contracts";

export const createUserBodySchema = CreateUserSchema;
export const updateUserBodySchema = UpdateUserSchema;

export const listUsersQuerySchema = z.object({
  email: z.string().email().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const setUserStatusBodySchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
  reason: z.string().max(500).optional(),
});

export const verifyEmailBodySchema = z.object({
  token: z.string().min(1),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type SetUserStatusBody = z.infer<typeof setUserStatusBodySchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;
