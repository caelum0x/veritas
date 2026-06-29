// Zod validators for transaction request bodies and query parameters.
import { z } from "zod";
import { TransactionKindSchema } from "@veritas/contracts";
import { paginationSchema } from "@veritas/contracts";

export const transactionIdParamSchema = z.object({
  id: z.string().min(1, "Transaction ID is required"),
});

export const listTransactionsQuerySchema = paginationSchema.extend({
  walletId: z.string().optional(),
  kind: TransactionKindSchema.optional(),
  settlementId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type TransactionIdParam = z.infer<typeof transactionIdParamSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
