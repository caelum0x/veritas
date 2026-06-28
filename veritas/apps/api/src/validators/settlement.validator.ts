// Zod validators for settlement request bodies and query parameters.
import { z } from "zod";
import { nonEmptyString, opaqueIdSchema, moneySchema } from "@veritas/contracts";

export const CreateSettlementBodySchema = z.object({
  orderId: opaqueIdSchema,
  amount: moneySchema,
  walletAddress: nonEmptyString,
  txHash: nonEmptyString.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateSettlementBodySchema = z.object({
  txHash: nonEmptyString.optional(),
  status: z.enum(["pending", "confirmed", "failed"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ListSettlementsQuerySchema = z.object({
  orderId: opaqueIdSchema.optional(),
  status: z.enum(["pending", "confirmed", "failed"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateSettlementBody = z.infer<typeof CreateSettlementBodySchema>;
export type UpdateSettlementBody = z.infer<typeof UpdateSettlementBodySchema>;
export type ListSettlementsQuery = z.infer<typeof ListSettlementsQuerySchema>;
