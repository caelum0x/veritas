// Zod schemas for credits feature HTTP request/response validation.
import { z } from "zod";
import { creditAmountSchema, creditSourceSchema } from "@veritas/credits";

export const GrantBodySchema = z.object({
  userId: z.string().min(1),
  amount: creditAmountSchema,
  source: creditSourceSchema,
  reason: z.string().min(1),
  expiresAt: z.string().datetime().nullable().default(null),
  metadata: z.record(z.string()).optional(),
});
export type GrantBody = z.infer<typeof GrantBodySchema>;

export const ConsumeBodySchema = z.object({
  userId: z.string().min(1),
  amount: creditAmountSchema,
  note: z.string().min(1),
  referenceId: z.string().optional(),
});
export type ConsumeBody = z.infer<typeof ConsumeBodySchema>;

export const ReserveBodySchema = z.object({
  userId: z.string().min(1),
  amount: creditAmountSchema,
  note: z.string().min(1),
  referenceId: z.string().optional(),
  expiresAt: z.string().datetime().nullable().default(null),
});
export type ReserveBody = z.infer<typeof ReserveBodySchema>;

export const ReleaseBodySchema = z.object({
  reservationId: z.string().min(1),
  consume: z.boolean(),
  amount: creditAmountSchema.optional(),
  note: z.string().optional(),
});
export type ReleaseBody = z.infer<typeof ReleaseBodySchema>;

export const UserIdParamsSchema = z.object({
  userId: z.string().min(1),
});
export type UserIdParams = z.infer<typeof UserIdParamsSchema>;

export const LedgerQuerySchema = z.object({
  kind: z.enum(["grant", "consume", "reserve", "release", "expire", "adjustment"]).optional(),
});
export type LedgerQuery = z.infer<typeof LedgerQuerySchema>;
