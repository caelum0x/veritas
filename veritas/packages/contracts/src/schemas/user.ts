// User entity: an authenticated human principal of the platform.

import { z } from "zod";
import { idSchema, timestampsSchema, metadataSchema } from "./common.js";

export const UserSchema = z
  .object({
    id: idSchema("user"),
    email: z.string().email(),
    emailVerified: z.boolean(),
    name: z.string().nullable(),
    avatarUrl: z.string().url().nullable(),
    status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
    lastLoginAt: z.string().nullable(),
    metadata: metadataSchema.optional(),
  })
  .merge(timestampsSchema);
export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  metadata: metadataSchema.optional(),
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  emailVerified: z.boolean().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]).optional(),
  metadata: metadataSchema.optional(),
});
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
