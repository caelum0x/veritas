// Configuration for the attestation-publisher app (anchor contract, batch size, intervals).

import { z } from "zod";

export const PublisherConfigSchema = z.object({
  /** EVM chain ID to publish attestations on. */
  chainId: z.number().int().positive().default(8453),
  /** On-chain anchor contract address (hex). */
  contractAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/).default("0x0000000000000000000000000000000000000001"),
  /** Maximum number of hashes to include in a single Merkle batch. */
  batchSize: z.number().int().min(1).max(1000).default(50),
  /** How often (ms) the scheduler triggers an anchor attempt. */
  intervalMs: z.number().int().min(1000).default(30_000),
  /** How many confirmations to wait before marking tx confirmed. */
  confirmations: z.number().int().min(1).default(2),
  /** Max concurrent pending batches. */
  maxPendingBatches: z.number().int().min(1).default(10),
});

export type PublisherConfig = z.infer<typeof PublisherConfigSchema>;

export function loadPublisherConfig(overrides: Partial<PublisherConfig> = {}): PublisherConfig {
  return PublisherConfigSchema.parse(overrides);
}
