// Zod validators for wallet request bodies and query parameters.
import { z } from "zod";

export const getWalletParamsSchema = z.object({
  id: z.string().min(1),
});

export const createWalletBodySchema = z.object({
  organizationId: z.string().min(1),
  address: z.string().min(1).max(256),
  chain: z.string().min(1).max(64),
  label: z.string().max(128).optional(),
});

export const listWalletsQuerySchema = z.object({
  organizationId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const depositParamsSchema = z.object({
  id: z.string().min(1),
});

export const depositBodySchema = z.object({
  amountUsdc: z.number().positive(),
  txHash: z.string().min(1).max(256),
});

export type GetWalletParams = z.infer<typeof getWalletParamsSchema>;
export type CreateWalletBody = z.infer<typeof createWalletBodySchema>;
export type ListWalletsQuery = z.infer<typeof listWalletsQuerySchema>;
export type DepositParams = z.infer<typeof depositParamsSchema>;
export type DepositBody = z.infer<typeof depositBodySchema>;
