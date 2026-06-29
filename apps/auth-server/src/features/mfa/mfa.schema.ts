// Zod schemas for MFA HTTP request/response validation.

import { z } from "zod";

export const EnrollTotpBodySchema = z.object({
  userId: z.string().min(1),
  label: z.string().min(1),
  issuer: z.string().min(1).default("Veritas"),
  algorithm: z.enum(["SHA1", "SHA256", "SHA512"]).optional(),
  digits: z.union([z.literal(6), z.literal(7), z.literal(8)]).optional(),
  period: z.number().int().positive().optional(),
});
export type EnrollTotpBody = z.infer<typeof EnrollTotpBodySchema>;

export const IssueChallengeBodySchema = z.object({
  userId: z.string().min(1),
  factorId: z.string().min(1),
});
export type IssueChallengeBody = z.infer<typeof IssueChallengeBodySchema>;

export const VerifyMfaBodySchema = z.object({
  challengeId: z.string().min(1),
  factorId: z.string().min(1),
  userId: z.string().min(1),
  payload: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("totp"), token: z.string().min(6).max(8) }),
    z.object({ kind: z.literal("hotp"), token: z.string().min(6).max(8) }),
    z.object({
      kind: z.literal("webauthn"),
      options: z.record(z.unknown()),
      assertion: z.record(z.unknown()),
    }),
    z.object({ kind: z.literal("recovery"), code: z.string().min(1) }),
  ]),
});
export type VerifyMfaBody = z.infer<typeof VerifyMfaBodySchema>;

export const ListFactorsQuerySchema = z.object({
  userId: z.string().min(1),
  activeOnly: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
});
export type ListFactorsQuery = z.infer<typeof ListFactorsQuerySchema>;

export const DeleteFactorParamsSchema = z.object({
  factorId: z.string().min(1),
});
export type DeleteFactorParams = z.infer<typeof DeleteFactorParamsSchema>;
