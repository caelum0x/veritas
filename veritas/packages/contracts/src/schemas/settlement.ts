// Settlement entity: an on-chain USDC settlement event finalizing an order.

import { z } from "zod";
import { idSchema, timestampsSchema, moneySchema } from "./common.js";

export const SettlementStatusSchema = z.enum([
  "SUBMITTED",
  "CONFIRMED",
  "FAILED",
]);
export type SettlementStatus = z.infer<typeof SettlementStatusSchema>;

export const SettlementSchema = z
  .object({
    id: idSchema("stl"),
    orderId: idSchema("order"),
    chain: z.literal("base"),
    txHash: z.string(),
    fromAddress: z.string(),
    toAddress: z.string(),
    amount: moneySchema,
    status: SettlementStatusSchema,
    blockNumber: z.number().int().min(0).nullable(),
    confirmedAt: z.string().nullable(),
  })
  .merge(timestampsSchema);
export type Settlement = z.infer<typeof SettlementSchema>;

export const CreateSettlementSchema = z.object({
  orderId: idSchema("order"),
  txHash: z.string(),
  fromAddress: z.string(),
  toAddress: z.string(),
  amount: moneySchema,
});
export type CreateSettlement = z.infer<typeof CreateSettlementSchema>;

export const UpdateSettlementSchema = z.object({
  status: SettlementStatusSchema.optional(),
  blockNumber: z.number().int().min(0).nullable().optional(),
  confirmedAt: z.string().nullable().optional(),
});
export type UpdateSettlement = z.infer<typeof UpdateSettlementSchema>;
