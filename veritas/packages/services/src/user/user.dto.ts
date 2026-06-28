// Input/output DTOs for user application service use-cases.
import { z } from "zod";
import {
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
} from "@veritas/contracts";

/** Input DTO for creating a new user account. */
export const CreateUserInputSchema = CreateUserSchema;
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

/** Input DTO for updating mutable user profile fields. */
export const UpdateUserInputSchema = UpdateUserSchema;
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

/** Query options for listing users. */
export const ListUsersInputSchema = z.object({
  email: z.string().email().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListUsersInput = z.infer<typeof ListUsersInputSchema>;

/** Input DTO for changing a user's status. */
export const SetUserStatusInputSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
  reason: z.string().max(500).optional(),
});
export type SetUserStatusInput = z.infer<typeof SetUserStatusInputSchema>;

/** Input DTO for verifying a user's email address. */
export const VerifyEmailInputSchema = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailInputSchema>;

/** Output DTO: a single user record. */
export const UserOutputSchema = UserSchema;
export type UserOutput = z.infer<typeof UserOutputSchema>;

/** Output DTO: paginated list of users. */
export const UserListOutputSchema = z.object({
  items: z.array(UserSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type UserListOutput = z.infer<typeof UserListOutputSchema>;

/** Factory to produce a canonical UserOutput from a raw record. */
export function toUserOutput(user: UserOutput): UserOutput {
  return { ...user };
}
