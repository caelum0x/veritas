// Zod request/response validation schemas for the users feature.
import { z } from "zod";
import { CreateUserSchema, UpdateUserSchema } from "@veritas/contracts";

export const CreateUserBodySchema = CreateUserSchema;
export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;

export const UpdateUserBodySchema = UpdateUserSchema;
export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;

export const UserParamsSchema = z.object({
  userId: z.string().min(1),
});
export type UserParams = z.infer<typeof UserParamsSchema>;

export const ListUsersQuerySchema = z.object({
  email: z.string().email().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const SetUserStatusBodySchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
  reason: z.string().max(500).optional(),
});
export type SetUserStatusBody = z.infer<typeof SetUserStatusBodySchema>;

export const VerifyEmailBodySchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailBody = z.infer<typeof VerifyEmailBodySchema>;
