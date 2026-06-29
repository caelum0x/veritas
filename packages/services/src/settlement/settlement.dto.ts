// Input/output DTOs for settlement application service use-cases.
import { z } from "zod";
import {
  SettlementSchema,
  CreateSettlementSchema,
  UpdateSettlementSchema,
  SettlementStatusSchema,
} from "@veritas/contracts";

/** Input DTO for submitting a new on-chain USDC settlement. */
export const CreateSettlementInputSchema = CreateSettlementSchema;
export type CreateSettlementInput = z.infer<typeof CreateSettlementInputSchema>;

/** Input DTO for updating settlement state (e.g. confirmed, failed). */
export const UpdateSettlementInputSchema = UpdateSettlementSchema;
export type UpdateSettlementInput = z.infer<typeof UpdateSettlementInputSchema>;

/** Query options for listing settlements. */
export const ListSettlementsInputSchema = z.object({
  orderId: z.string().optional(),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
  status: SettlementStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListSettlementsInput = z.infer<typeof ListSettlementsInputSchema>;

/** Input DTO for confirming a settlement after on-chain finalization. */
export const ConfirmSettlementInputSchema = z.object({
  settlementId: z.string().min(1),
  blockNumber: z.number().int().min(0),
  confirmedAt: z.string().min(1),
});
export type ConfirmSettlementInput = z.infer<typeof ConfirmSettlementInputSchema>;

/** Input DTO for marking a settlement as failed. */
export const FailSettlementInputSchema = z.object({
  settlementId: z.string().min(1),
  reason: z.string().max(500).optional(),
});
export type FailSettlementInput = z.infer<typeof FailSettlementInputSchema>;

/** Output DTO: a single settlement record. */
export const SettlementOutputSchema = SettlementSchema;
export type SettlementOutput = z.infer<typeof SettlementOutputSchema>;

/** Output DTO: paginated list of settlements. */
export const SettlementListOutputSchema = z.object({
  items: z.array(SettlementSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type SettlementListOutput = z.infer<typeof SettlementListOutputSchema>;

/** Factory to produce a canonical SettlementOutput from a raw record. */
export function toSettlementOutput(settlement: SettlementOutput): SettlementOutput {
  return { ...settlement };
}
