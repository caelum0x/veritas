// Wallet entity: an on-chain USDC wallet (Base) owned by an org/agent.

import { z } from "zod";
import { idSchema, timestampsSchema, moneySchema } from "./common.js";

export const WalletSchema = z
  .object({
    id: idSchema("wlt"),
    organizationId: idSchema("org").nullable(),
    agentId: idSchema("agent").nullable(),
    chain: z.literal("base"),
    address: z.string(),
    balance: moneySchema,
    isCustodial: z.boolean(),
  })
  .merge(timestampsSchema);
export type Wallet = z.infer<typeof WalletSchema>;

export const CreateWalletSchema = z.object({
  organizationId: idSchema("org").nullable().optional(),
  agentId: idSchema("agent").nullable().optional(),
  address: z.string(),
  isCustodial: z.boolean().optional(),
});
export type CreateWallet = z.infer<typeof CreateWalletSchema>;
