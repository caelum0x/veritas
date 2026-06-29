// Zod schemas for session HTTP request/response validation.

import { z } from "zod";

export const CreateSessionBodySchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  ip: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  ttlSeconds: z.number().int().positive().optional(),
});
export type CreateSessionBody = z.infer<typeof CreateSessionBodySchema>;

export const VerifySessionBodySchema = z.object({
  token: z.string().min(1),
});
export type VerifySessionBody = z.infer<typeof VerifySessionBodySchema>;

export const RevokeSessionParamsSchema = z.object({
  sessionId: z.string().min(1),
});
export type RevokeSessionParams = z.infer<typeof RevokeSessionParamsSchema>;

export const RevokeSessionBodySchema = z.object({
  userId: z.string().min(1),
});
export type RevokeSessionBody = z.infer<typeof RevokeSessionBodySchema>;

export const ListSessionsQuerySchema = z.object({
  userId: z.string().min(1),
});
export type ListSessionsQuery = z.infer<typeof ListSessionsQuerySchema>;
