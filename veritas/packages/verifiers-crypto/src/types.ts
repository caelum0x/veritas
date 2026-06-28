// Crypto-verifier domain types: chains, token facts, tx summaries, contract info, price points.

import { z } from "zod";
import { isoTimestampSchema, scoreSchema } from "@veritas/core";

/** Supported EVM-compatible chain identifiers. */
export const ChainIdSchema = z.enum(["ethereum", "polygon", "arbitrum", "base", "optimism", "bsc"]);
export type ChainId = z.infer<typeof ChainIdSchema>;

/** Hex-encoded Ethereum address (0x-prefixed). */
export const EvmAddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid EVM address");
export type EvmAddress = z.infer<typeof EvmAddressSchema>;

/** Hex-encoded transaction hash (0x-prefixed, 64 hex chars). */
export const TxHashSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "Invalid transaction hash");
export type TxHash = z.infer<typeof TxHashSchema>;

/** Summary of an on-chain transaction relevant to claim verification. */
export const TxSummarySchema = z.object({
  hash: TxHashSchema,
  chainId: ChainIdSchema,
  blockNumber: z.number().int().nonnegative(),
  timestamp: isoTimestampSchema,
  from: EvmAddressSchema,
  to: EvmAddressSchema.nullable(),
  valueEth: z.string(),
  gasUsed: z.number().int().nonnegative(),
  status: z.enum(["success", "failed", "pending"]),
  methodSignature: z.string().nullable(),
});
export type TxSummary = z.infer<typeof TxSummarySchema>;

/** On-chain contract verification record. */
export const ContractInfoSchema = z.object({
  address: EvmAddressSchema,
  chainId: ChainIdSchema,
  name: z.string().nullable(),
  compiler: z.string().nullable(),
  isVerified: z.boolean(),
  isProxy: z.boolean(),
  implementationAddress: EvmAddressSchema.nullable(),
  deployedAt: isoTimestampSchema.nullable(),
  audits: z.array(
    z.object({
      auditor: z.string(),
      reportUrl: z.string().url(),
      completedAt: isoTimestampSchema,
    })
  ),
});
export type ContractInfo = z.infer<typeof ContractInfoSchema>;

/** Token metadata and supply facts. */
export const TokenFactsSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  chainId: ChainIdSchema,
  contractAddress: EvmAddressSchema.nullable(),
  decimals: z.number().int().min(0).max(77),
  totalSupply: z.string().nullable(),
  circulatingSupply: z.string().nullable(),
  marketCapUsd: z.number().nonnegative().nullable(),
  rank: z.number().int().positive().nullable(),
  retrievedAt: isoTimestampSchema,
});
export type TokenFacts = z.infer<typeof TokenFactsSchema>;

/** A single price observation from the feed. */
export const PricePointSchema = z.object({
  symbol: z.string().min(1),
  priceUsd: z.number().nonnegative(),
  change24hPct: z.number().nullable(),
  volume24hUsd: z.number().nonnegative().nullable(),
  observedAt: isoTimestampSchema,
  sourceName: z.string(),
});
export type PricePoint = z.infer<typeof PricePointSchema>;

/** Claim-level crypto context extracted during matching. */
export const CryptoClaimContextSchema = z.object({
  mentionedSymbols: z.array(z.string()),
  mentionedAddresses: z.array(EvmAddressSchema),
  mentionedTxHashes: z.array(TxHashSchema),
  mentionedChains: z.array(ChainIdSchema),
  /** Claimed price or return figure parsed from text (if any). */
  claimedPriceUsd: z.number().nullable(),
  claimedReturnPct: z.number().nullable(),
});
export type CryptoClaimContext = z.infer<typeof CryptoClaimContextSchema>;

/** Relevance score attached to a matched crypto entity. */
export const EntityRelevanceSchema = z.object({
  entity: z.string(),
  kind: z.enum(["symbol", "address", "txHash", "chain"]),
  relevance: scoreSchema,
});
export type EntityRelevance = z.infer<typeof EntityRelevanceSchema>;
