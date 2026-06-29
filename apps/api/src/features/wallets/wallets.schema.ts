// Zod request/response schemas for the wallets feature HTTP layer.
import { z } from "zod";

export const walletIdParamSchema = z.object({
  id: z.string().min(1, "Wallet ID is required"),
});
export type WalletIdParam = z.infer<typeof walletIdParamSchema>;

export const listWalletsQuerySchema = z.object({
  organizationId: z.string().optional(),
  agentId: z.string().optional(),
  isCustodial: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ListWalletsQuery = z.infer<typeof listWalletsQuerySchema>;

export const createWalletBodySchema = z.object({
  organizationId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  address: z.string().min(1),
  isCustodial: z.boolean().optional(),
});
export type CreateWalletBody = z.infer<typeof createWalletBodySchema>;

export const updateWalletBodySchema = z.object({
  organizationId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  address: z.string().min(1).optional(),
  isCustodial: z.boolean().optional(),
});
export type UpdateWalletBody = z.infer<typeof updateWalletBodySchema>;
