// Input/output DTOs for session application service use-cases.
import { z } from "zod";
import { SessionSchema, CreateSessionSchema } from "@veritas/contracts";

/** Input DTO for creating a new session (raw token provided by caller). */
export const CreateSessionInputSchema = CreateSessionSchema.extend({
  /** Raw bearer token — will be hashed before persistence. */
  rawToken: z.string().min(32),
});
export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;

/** Input DTO for validating and resolving a session from a raw token. */
export const ValidateSessionInputSchema = z.object({
  rawToken: z.string().min(1),
});
export type ValidateSessionInput = z.infer<typeof ValidateSessionInputSchema>;

/** Query options for listing sessions belonging to a user. */
export const ListSessionsInputSchema = z.object({
  userId: z.string().min(1),
  includeRevoked: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListSessionsInput = z.infer<typeof ListSessionsInputSchema>;

/** Input DTO for revoking a specific session by id. */
export const RevokeSessionInputSchema = z.object({
  sessionId: z.string().min(1),
});
export type RevokeSessionInput = z.infer<typeof RevokeSessionInputSchema>;

/** Input DTO for revoking all sessions of a user except an optional one. */
export const RevokeAllSessionsInputSchema = z.object({
  userId: z.string().min(1),
  exceptSessionId: z.string().optional(),
});
export type RevokeAllSessionsInput = z.infer<typeof RevokeAllSessionsInputSchema>;

/** Output DTO: a single session record (hashedToken omitted for safety). */
export const SessionOutputSchema = SessionSchema.omit({ hashedToken: true });
export type SessionOutput = z.infer<typeof SessionOutputSchema>;

/** Output DTO: paginated list of sessions. */
export const SessionListOutputSchema = z.object({
  items: z.array(SessionOutputSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type SessionListOutput = z.infer<typeof SessionListOutputSchema>;

/** Factory to produce a safe SessionOutput from a raw Session record. */
export function toSessionOutput(session: z.infer<typeof SessionSchema>): SessionOutput {
  const { hashedToken: _omitted, ...rest } = session;
  return rest;
}
