// Session entity: an authenticated session bound to a hashed token.

import { z } from "zod";
import { idSchema, timestampsSchema } from "./common.js";

export const SessionSchema = z
  .object({
    id: idSchema("ses"),
    userId: idSchema("user"),
    hashedToken: z.string(),
    ip: z.string().nullable(),
    userAgent: z.string().nullable(),
    expiresAt: z.string(),
    revokedAt: z.string().nullable(),
    lastActiveAt: z.string().nullable(),
  })
  .merge(timestampsSchema);
export type Session = z.infer<typeof SessionSchema>;

export const CreateSessionSchema = z.object({
  userId: idSchema("user"),
  ip: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  expiresAt: z.string(),
});
export type CreateSession = z.infer<typeof CreateSessionSchema>;
