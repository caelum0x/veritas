// Input/output DTOs for wallet use-cases.
import { z } from "zod";
import { WalletSchema, CreateWalletSchema } from "@veritas/contracts";

/** DTO for registering a new on-chain wallet. */
export const CreateWalletInputSchema = CreateWalletSchema;
export type CreateWalletInput = z.infer<typeof CreateWalletInputSchema>;

/** DTO for updating mutable wallet fields (e.g. balance sync). */
export const UpdateWalletInputSchema = z.object({
  organizationId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  address: z.string().optional(),
  isCustodial: z.boolean().optional(),
});
export type UpdateWalletInput = z.infer<typeof UpdateWalletInputSchema>;

/** DTO for filtering wallets in list queries. */
export const ListWalletsInputSchema = z.object({
  organizationId: z.string().optional(),
  agentId: z.string().optional(),
  isCustodial: z.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListWalletsInput = z.infer<typeof ListWalletsInputSchema>;

/** Output DTO representing a single wallet. */
export const WalletOutputSchema = WalletSchema;
export type WalletOutput = z.infer<typeof WalletOutputSchema>;
