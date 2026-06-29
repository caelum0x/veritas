// Zod validators for session request bodies and query parameters.
import { z } from "zod";
import { nonEmptyString, urlSchema } from "@veritas/contracts";

export const CreateSessionBodySchema = z.object({
  email: z.string().email(),
  password: nonEmptyString,
  redirectUrl: urlSchema.optional(),
});

export const RefreshSessionBodySchema = z.object({
  refreshToken: nonEmptyString,
});

export const RevokeSessionBodySchema = z.object({
  sessionId: nonEmptyString.optional(),
  all: z.boolean().optional().default(false),
});

export type CreateSessionBody = z.infer<typeof CreateSessionBodySchema>;
export type RefreshSessionBody = z.infer<typeof RefreshSessionBodySchema>;
export type RevokeSessionBody = z.infer<typeof RevokeSessionBodySchema>;
