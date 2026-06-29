// Public surface of @veritas/verifiers-crypto.

export * from "./types.js";
export * from "./errors.js";
export * from "./rules.js";
export * from "./scoring.js";

export { CryptoVerifier, createCryptoVerifier } from "./verifier.js";
export {
  extractEvmHashes,
  extractBtcTxIds,
  extractCryptoSymbols,
  canHandleCryptoClaim,
  cryptoRelevanceScore,
} from "./matcher.js";

// Source ports + mocks.
export type { PriceFeedPort, PriceRecord, PriceCandle } from "./sources/price-feed.js";
export { MockPriceFeed, createMockPriceFeed } from "./sources/price-feed.js";

// Real, network-backed price feed (CoinGecko, keyless).
export { CoinGeckoPriceFeed, createCoinGeckoPriceFeed } from "./sources/coingecko-price-feed.js";
export type { CoinGeckoPriceFeedOptions } from "./sources/coingecko-price-feed.js";

// On-chain lookup ports + mocks.
export type { TxLookupPort, TxRecord, TxLookupQuery } from "./sources/tx-lookup.js";
export { MockTxLookup, createMockTxLookup } from "./sources/tx-lookup.js";
export type { ContractVerifyPort, ContractVerifyRecord } from "./sources/contract-verify.js";
export { MockContractVerify, createMockContractVerify } from "./sources/contract-verify.js";

// Real, network-backed on-chain sources (keyless public endpoints).
export { EvmRpcTxLookup, createEvmRpcTxLookup } from "./sources/evm-rpc-tx-lookup.js";
export type { EvmRpcTxLookupOptions } from "./sources/evm-rpc-tx-lookup.js";
export { SourcifyContractVerify, createSourcifyContractVerify } from "./sources/sourcify-contract-verify.js";
export type { SourcifyContractVerifyOptions } from "./sources/sourcify-contract-verify.js";
