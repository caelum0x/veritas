// Crypto evidence model: typed evidence structures for on-chain transactions, contracts, tokens, and prices.

import { z } from "zod";
import { isoTimestampSchema } from "@veritas/core";
import { DomainEvidenceSchema } from "@veritas/verifier-kit";

/** On-chain transaction evidence with blockchain-specific metadata. */
export const TxEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("tx-lookup"),
  metadata: z.object({
    txHash: z.string(),
    chainId: z.number().int().positive(),
    chainName: z.string(),
    from: z.string(),
    to: z.string().nullable(),
    valueEth: z.string(),
    valueUsd: z.number().nonnegative().optional(),
    blockNumber: z.number().int().nonnegative(),
    blockTimestamp: isoTimestampSchema,
    status: z.enum(["success", "reverted", "pending"]),
    gasUsed: z.number().nonnegative().optional(),
  }),
});
export type TxEvidence = z.infer<typeof TxEvidenceSchema>;

/** Smart contract verification evidence. */
export const ContractEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("contract-verify"),
  metadata: z.object({
    address: z.string(),
    chainId: z.number().int().positive(),
    chainName: z.string(),
    isVerified: z.boolean(),
    contractName: z.string().optional(),
    compilerVersion: z.string().optional(),
    isProxy: z.boolean().optional(),
    implementationAddress: z.string().optional(),
    deployedAt: isoTimestampSchema.nullable(),
    deployer: z.string().optional(),
  }),
});
export type ContractEvidence = z.infer<typeof ContractEvidenceSchema>;

/** Token market and supply data evidence. */
export const TokenEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("token-data"),
  metadata: z.object({
    symbol: z.string(),
    name: z.string(),
    chainId: z.number().int().positive().optional(),
    contractAddress: z.string().optional(),
    marketCapUsd: z.number().nonnegative().optional(),
    circulatingSupply: z.number().nonnegative().optional(),
    totalSupply: z.number().nonnegative().optional(),
    rank: z.number().int().positive().optional(),
    dataDate: isoTimestampSchema,
  }),
});
export type TokenEvidence = z.infer<typeof TokenEvidenceSchema>;

/** Price feed evidence for token/asset prices. */
export const PriceEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("price-feed"),
  metadata: z.object({
    symbol: z.string(),
    priceUsd: z.number().nonnegative(),
    priceChange24hPct: z.number().optional(),
    volume24hUsd: z.number().nonnegative().optional(),
    high24hUsd: z.number().nonnegative().optional(),
    low24hUsd: z.number().nonnegative().optional(),
    priceAt: isoTimestampSchema,
    source: z.string(),
  }),
});
export type PriceEvidence = z.infer<typeof PriceEvidenceSchema>;

/** Union of all crypto evidence types. */
export type CryptoEvidence = TxEvidence | ContractEvidence | TokenEvidence | PriceEvidence;

/** Aggregate crypto evidence result from all sources. */
export interface CryptoEvidenceResult {
  readonly claimId: string;
  readonly txEvidence: ReadonlyArray<TxEvidence>;
  readonly contractEvidence: ReadonlyArray<ContractEvidence>;
  readonly tokenEvidence: ReadonlyArray<TokenEvidence>;
  readonly priceEvidence: ReadonlyArray<PriceEvidence>;
  readonly overallRelevance: number;
}

/** Build a CryptoEvidenceResult (pure, immutable). */
export function makeCryptoEvidenceResult(
  claimId: string,
  txEvidence: ReadonlyArray<TxEvidence>,
  contractEvidence: ReadonlyArray<ContractEvidence>,
  tokenEvidence: ReadonlyArray<TokenEvidence>,
  priceEvidence: ReadonlyArray<PriceEvidence>,
): CryptoEvidenceResult {
  const allScores = [
    ...txEvidence.map((e) => e.relevanceScore),
    ...contractEvidence.map((e) => e.relevanceScore),
    ...tokenEvidence.map((e) => e.relevanceScore),
    ...priceEvidence.map((e) => e.relevanceScore),
  ];
  const overallRelevance =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;
  return Object.freeze({
    claimId,
    txEvidence: [...txEvidence],
    contractEvidence: [...contractEvidence],
    tokenEvidence: [...tokenEvidence],
    priceEvidence: [...priceEvidence],
    overallRelevance,
  });
}
