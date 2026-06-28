// CAP/CROO agent protocol configuration section
import { z } from "zod";

export const CrooConfigSchema = z.object({
  /** Base RPC endpoint for the CROO Agent Protocol network */
  rpcUrl: z.string().url(),
  /** USDC contract address on Base */
  usdcAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Must be a valid EVM address"),
  /** Veritas agent wallet private key (hex, 0x-prefixed) */
  agentPrivateKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Must be a valid 64-byte hex private key"),
  /** Veritas agent ENS name or on-chain identifier */
  agentId: z.string().min(1),
  /** Chain ID for the target network (e.g. 8453 for Base mainnet) */
  chainId: z.number().int().positive(),
  /** Minimum USDC settlement amount in micro-units (6 decimals) */
  minSettlementUsdc: z.number().int().nonnegative().default(1_000_000),
  /** Maximum USDC settlement amount in micro-units */
  maxSettlementUsdc: z.number().int().positive().default(100_000_000),
  /** Timeout in milliseconds for on-chain settlement confirmation */
  settlementTimeoutMs: z.number().int().positive().default(60_000),
  /** Number of block confirmations required before marking settled */
  confirmations: z.number().int().min(1).default(2),
  /** Whether to operate in simulation mode (no real transactions) */
  simulate: z.boolean().default(false),
});

export type CrooConfig = z.infer<typeof CrooConfigSchema>;

export const crooDefaults: Partial<CrooConfig> = {
  chainId: 8453,
  minSettlementUsdc: 1_000_000,
  maxSettlementUsdc: 100_000_000,
  settlementTimeoutMs: 60_000,
  confirmations: 2,
  simulate: false,
};
