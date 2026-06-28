// Transaction entity: a ledger line recording a credit/debit against a wallet.

import { z } from "zod";
import { idSchema, timestampsSchema, moneySchema } from "./common.js";

export const TransactionKindSchema = z.enum([
  "CREDIT",
  "DEBIT",
  "REFUND",
  "FEE",
]);
export type TransactionKind = z.infer<typeof TransactionKindSchema>;

export const TransactionSchema = z
  .object({
    id: idSchema("txn"),
    walletId: idSchema("wlt"),
    orderId: idSchema("order").nullable(),
    settlementId: idSchema("stl").nullable(),
    kind: TransactionKindSchema,
    amount: moneySchema,
    balanceAfter: moneySchema,
    description: z.string().nullable(),
  })
  .merge(timestampsSchema);
export type Transaction = z.infer<typeof TransactionSchema>;

export const CreateTransactionSchema = z.object({
  walletId: idSchema("wlt"),
  orderId: idSchema("order").nullable().optional(),
  settlementId: idSchema("stl").nullable().optional(),
  kind: TransactionKindSchema,
  amount: moneySchema,
  description: z.string().nullable().optional(),
});
export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;
