// Input/output DTOs for transaction use-cases.
import { z } from "zod";
import { TransactionSchema, CreateTransactionSchema, TransactionKindSchema } from "@veritas/contracts";

/** DTO for recording a new ledger transaction. */
export const CreateTransactionInputSchema = CreateTransactionSchema;
export type CreateTransactionInput = z.infer<typeof CreateTransactionInputSchema>;

/** DTO for filtering transactions in list queries. */
export const ListTransactionsInputSchema = z.object({
  walletId: z.string().optional(),
  orderId: z.string().optional(),
  settlementId: z.string().optional(),
  kind: TransactionKindSchema.optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListTransactionsInput = z.infer<typeof ListTransactionsInputSchema>;

/** DTO for listing transactions for a specific wallet. */
export const ListWalletTransactionsInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListWalletTransactionsInput = z.infer<typeof ListWalletTransactionsInputSchema>;

/** Output DTO representing a single transaction. */
export const TransactionOutputSchema = TransactionSchema;
export type TransactionOutput = z.infer<typeof TransactionOutputSchema>;
