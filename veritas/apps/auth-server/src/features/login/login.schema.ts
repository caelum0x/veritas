// Zod schemas for the login feature request/response shapes.

import { z } from "zod";

export const LoginRequestSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
  organizationId: z.string().min(1).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  sessionId: z.string(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshRequestSchema = z.object({
  token: z.string().min(1, "Token is required"),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
